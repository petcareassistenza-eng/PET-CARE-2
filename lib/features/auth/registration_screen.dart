import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../config.dart';

/// 🎯 REGISTRAZIONE COMPLETA MyPetCare con:
/// - Doppio ruolo: PROPRIETARIO vs PROFESSIONISTA
/// - Campi comuni: nome, cognome, email, password, phone, city, address
/// - Campi PRO: businessName, category, P.IVA, CF, studio address, ordine/albo, contatti professionali
/// - Preferenze notifiche (push, email, marketing)
/// - Privacy & Termini obbligatori
/// - Salvataggio differenziato su Firestore (users vs pros)
/// - Redirect intelligente: Owner → home, Pro → subscription
class RegistrationScreen extends StatefulWidget {
  const RegistrationScreen({super.key});

  @override
  State<RegistrationScreen> createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _formKey = GlobalKey<FormState>();

  // Ruolo
  String _selectedRole = 'owner'; // 'owner' o 'pro'

  // Campi comuni
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  // Telefono rimosso come richiesto
  final _cityController = TextEditingController();
  final _addressController = TextEditingController();

  // Campi PRO
  final _businessNameController = TextEditingController();
  String _selectedCategory = 'veterinario';
  final _pivaController = TextEditingController();
  final _cfController = TextEditingController();
  final _studioAddressController = TextEditingController();
  final _ordineController = TextEditingController();
  final _ordineProvinceController = TextEditingController();
  final _ordineNumberController = TextEditingController();
  // Telefono professionale rimosso come richiesto
  final _proEmailController = TextEditingController();
  final _websiteController = TextEditingController();

  // Privacy & Termini
  bool _privacyAccepted = false;
  bool _termsAccepted = false;

  // Notifiche
  bool _pushEnabled = true;
  bool _emailEnabled = true;
  bool _marketingEnabled = false;

  bool _isLoading = false;

  @override
  void dispose() {
    // Comuni
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    // _phoneController.dispose(); // Rimosso
    _cityController.dispose();
    _addressController.dispose();

    // PRO
    _businessNameController.dispose();
    _pivaController.dispose();
    _cfController.dispose();
    _studioAddressController.dispose();
    _ordineController.dispose();
    _ordineProvinceController.dispose();
    _ordineNumberController.dispose();
    // _proPhoneController.dispose(); // Rimosso
    _proEmailController.dispose();
    _websiteController.dispose();

    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();

    if (!_formKey.currentState!.validate()) return;

    if (!_privacyAccepted || !_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Devi accettare Privacy e Termini per registrarti.'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 3),
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // 1) Creazione utente su Firebase Auth
      final credential = await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      final uid = credential.user!.uid;

      if (kDebugMode) {
        debugPrint('✅ Utente creato su Firebase Auth: $uid');
      }

      // 2) Prepara dati per backend API
      final fullName = '${_firstNameController.text.trim()} ${_lastNameController.text.trim()}';
      final role = _selectedRole; // 'owner' o 'pro'

      final requestBody = {
        'uid': uid,
        'role': role,
        'fullName': fullName,
        // Campi telefono rimossi
        'proEmail': _proEmailController.text.trim(),
        'website': _websiteController.text.trim(),
        'notifications': {
          'push': _pushEnabled,
          'email': _emailEnabled,
          'marketing': _marketingEnabled,
        },
      };

      if (kDebugMode) {
        debugPrint('📤 Chiamata backend API: ${AppConfig.backendBaseUrl}/api/auth/register');
      }

      // 3) Chiama backend API per creare profilo
      final response = await http.post(
        Uri.parse('${AppConfig.backendBaseUrl}/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      if (response.statusCode >= 400) {
        throw Exception('Errore backend: ${response.statusCode} ${response.body}');
      }

      if (kDebugMode) {
        debugPrint('✅ Profilo creato su backend: ${response.body}');
      }

      // 4) Invia email di verifica
      await credential.user!.sendEmailVerification();

      if (!mounted) return;

      // 5) Redirect in base al ruolo
      if (role == 'owner') {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Registrazione completata! Verifica la tua email'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
        context.go('/homeOwner');
      } else {
        // Professionista → flusso abbonamento obbligatorio
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Registrazione completata! Attiva il tuo abbonamento PRO'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
        context.go('/subscription');
      }
    } on FirebaseAuthException catch (e) {
      String message = 'Registrazione non riuscita.';
      if (e.code == 'email-already-in-use') {
        message = 'Questa email è già registrata.';
      } else if (e.code == 'weak-password') {
        message = 'La password è troppo debole.';
      }
      if (kDebugMode) {
        debugPrint('FirebaseAuthException: ${e.code} - ${e.message}');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red),
        );
      }
    } catch (e, st) {
      if (kDebugMode) {
        debugPrint('Errore generico registrazione: $e\n$st');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Errore imprevisto durante la registrazione.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _openPrivacy() {
    context.push('/privacy');
  }

  void _openTerms() {
    context.push('/terms');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Registrati'),
        backgroundColor: const Color(0xFF247B75),
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: Form(
                key: _formKey,
                child: Column(
                  children: [
                    // 🏠🐾 Logo Casa + Zampa (coerente con splash e login)
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                            color: Colors.black.withOpacity(0.1),
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/images/my_pet_care_splash_logo.png',
                        width: 80,
                        height: 80,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.pets,
                          size: 80,
                          color: Color(0xFF247B75),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Nome app e tagline
                    const Text(
                      'MY PET CARE',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF247B75),
                        letterSpacing: 1.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Il tuo pet, il nostro impegno',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(height: 24),
                    
                    _buildRoleSelector(),
                    const SizedBox(height: 16),
                    _buildCommonFields(),
                    const SizedBox(height: 16),
                    if (_selectedRole == 'pro') _buildProFields(),
                    const SizedBox(height: 16),
                    _buildNotificationsSection(),
                    const SizedBox(height: 16),
                    _buildPrivacySection(),
                    const SizedBox(height: 24),
                    _isLoading
                        ? const CircularProgressIndicator()
                        : SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _submit,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF247B75),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                              ),
                              child: Text(
                                _selectedRole == 'owner' 
                                    ? 'Registrati come Proprietario'
                                    : 'Registrati come Professionista',
                                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                    const SizedBox(height: 16),
                    
                    // Link login
                    TextButton(
                      onPressed: () => context.pop(),
                      child: const Text('Hai già un account? Accedi'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Seleziona il tuo ruolo:',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildRoleCard(
                role: 'owner',
                icon: Icons.person,
                title: 'Proprietario',
                subtitle: 'Prenota servizi per i tuoi animali',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildRoleCard(
                role: 'pro',
                icon: Icons.work,
                title: 'Professionista',
                subtitle: 'Offri servizi veterinari e pet care',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRoleCard({
    required String role,
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final isSelected = _selectedRole == role;

    return Card(
      elevation: isSelected ? 8 : 2,
      color: isSelected ? const Color(0xFF247B75).withValues(alpha: 0.1) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isSelected ? const Color(0xFF247B75) : Colors.grey.shade300,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: () => setState(() => _selectedRole = role),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Icon(
                icon,
                size: 40,
                color: isSelected ? const Color(0xFF247B75) : Colors.grey,
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isSelected ? const Color(0xFF247B75) : Colors.black87,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey.shade600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCommonFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Dati Personali',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _firstNameController,
                decoration: const InputDecoration(
                  labelText: 'Nome',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Inserisci il nome';
                  }
                  return null;
                },
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextFormField(
                controller: _lastNameController,
                decoration: const InputDecoration(
                  labelText: 'Cognome',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Inserisci il cognome';
                  }
                  return null;
                },
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _emailController,
          decoration: const InputDecoration(
            labelText: 'Email',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.email_outlined),
          ),
          keyboardType: TextInputType.emailAddress,
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Inserisci l\'email';
            }
            if (!value.contains('@')) {
              return 'Email non valida';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _passwordController,
          decoration: const InputDecoration(
            labelText: 'Password',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.lock_outline),
          ),
          obscureText: true,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Inserisci la password';
            }
            if (value.length < 6) {
              return 'La password deve avere almeno 6 caratteri';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _confirmPasswordController,
          decoration: const InputDecoration(
            labelText: 'Conferma password',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.lock_outline),
          ),
          obscureText: true,
          validator: (value) {
            if (value != _passwordController.text) {
              return 'Le password non coincidono';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        // Campo telefono rimosso come richiesto

        TextFormField(
          controller: _cityController,
          decoration: const InputDecoration(
            labelText: 'Città / Comune',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.location_city_outlined),
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Inserisci la città';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _addressController,
          decoration: const InputDecoration(
            labelText: 'Indirizzo (opzionale)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.home_outlined),
          ),
        ),
      ],
    );
  }

  Widget _buildProFields() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        const Text(
          'Dati Professionista',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _businessNameController,
          decoration: const InputDecoration(
            labelText: 'Nome attività / Studio *',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.business),
          ),
          validator: (value) {
            if (_selectedRole == 'pro' &&
                (value == null || value.trim().isEmpty)) {
              return 'Inserisci il nome dell\'attività';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          initialValue: _selectedCategory,
          decoration: const InputDecoration(
            labelText: 'Categoria *',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.category),
          ),
          items: const [
            DropdownMenuItem(value: 'veterinario', child: Text('Veterinario')),
            DropdownMenuItem(value: 'pet_sitter', child: Text('Pet sitter')),
            DropdownMenuItem(value: 'taxi_pet', child: Text('Taxi pet')),
            DropdownMenuItem(value: 'toelettatore', child: Text('Toelettatore')),
            DropdownMenuItem(value: 'parco', child: Text('Parco')),
            DropdownMenuItem(value: 'allevatore', child: Text('Allevatore')),
            DropdownMenuItem(value: 'educatore', child: Text('Educatore')),
            DropdownMenuItem(value: 'pensione', child: Text('Pensione')),
          ],
          onChanged: (value) {
            if (value == null) return;
            setState(() {
              _selectedCategory = value;
            });
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _pivaController,
          decoration: const InputDecoration(
            labelText: 'Partita IVA *',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.numbers),
            hintText: '11 cifre',
          ),
          keyboardType: TextInputType.number,
          validator: (value) {
            if (_selectedRole == 'pro' &&
                (value == null || value.trim().isEmpty)) {
              return 'Inserisci la P.IVA';
            }
            if (value != null && value.trim().isNotEmpty && value.length != 11) {
              return 'P.IVA deve avere 11 cifre';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _cfController,
          decoration: const InputDecoration(
            labelText: 'Codice Fiscale (opzionale)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.badge_outlined),
            hintText: '16 caratteri',
          ),
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _studioAddressController,
          decoration: const InputDecoration(
            labelText: 'Indirizzo studio *',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.location_on_outlined),
          ),
          validator: (value) {
            if (_selectedRole == 'pro' &&
                (value == null || value.trim().isEmpty)) {
              return 'Inserisci l\'indirizzo dello studio';
            }
            return null;
          },
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _ordineController,
          decoration: const InputDecoration(
            labelText: 'Ordine / Albo (es. Ordine Medici Veterinari)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.verified_outlined),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _ordineProvinceController,
                decoration: const InputDecoration(
                  labelText: 'Provincia Ordine',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.location_city_outlined),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextFormField(
                controller: _ordineNumberController,
                decoration: const InputDecoration(
                  labelText: 'N. iscrizione',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.tag),
                ),
                keyboardType: TextInputType.number,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        // Campo telefono professionale rimosso come richiesto

        TextFormField(
          controller: _proEmailController,
          decoration: const InputDecoration(
            labelText: 'Email professionale (opzionale)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.email_outlined),
            hintText: 'Se diversa da quella personale',
          ),
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 12),
        TextFormField(
          controller: _websiteController,
          decoration: const InputDecoration(
            labelText: 'Sito web / Social (opzionale)',
            border: OutlineInputBorder(),
            prefixIcon: Icon(Icons.language),
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Divider(height: 32),
        const Text(
          'Preferenze Notifiche',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('Notifiche push'),
                subtitle: const Text('Ricevi notifiche in-app'),
                value: _pushEnabled,
                activeColor: const Color(0xFF247B75),
                onChanged: (val) {
                  setState(() {
                    _pushEnabled = val;
                  });
                },
              ),
              const Divider(height: 1),
              SwitchListTile(
                title: const Text('Notifiche email'),
                subtitle: const Text('Prenotazioni, modifiche, cancellazioni'),
                value: _emailEnabled,
                activeColor: const Color(0xFF247B75),
                onChanged: (val) {
                  setState(() {
                    _emailEnabled = val;
                  });
                },
              ),
              const Divider(height: 1),
              SwitchListTile(
                title: const Text('Comunicazioni marketing'),
                subtitle: const Text('Offerte, promozioni e novità'),
                value: _marketingEnabled,
                activeColor: const Color(0xFF247B75),
                onChanged: (val) {
                  setState(() {
                    _marketingEnabled = val;
                  });
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPrivacySection() {
    return Column(
      children: [
        const Divider(height: 32),
        Container(
          decoration: BoxDecoration(
            border: Border.all(
              color: (_privacyAccepted && _termsAccepted)
                  ? Colors.green
                  : Colors.red.shade300,
              width: 2,
            ),
            borderRadius: BorderRadius.circular(8),
            color: (_privacyAccepted && _termsAccepted)
                ? Colors.green.shade50
                : Colors.red.shade50,
          ),
          child: Column(
            children: [
              CheckboxListTile(
                value: _privacyAccepted,
                onChanged: (val) {
                  setState(() {
                    _privacyAccepted = val ?? false;
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
                checkColor: Colors.white,
                activeColor: const Color(0xFF247B75),
                title: RichText(
                  text: TextSpan(
                    style: Theme.of(context).textTheme.bodyMedium,
                    children: [
                      const TextSpan(text: 'Ho letto e accetto la '),
                      TextSpan(
                        text: 'Privacy Policy',
                        style: const TextStyle(
                          decoration: TextDecoration.underline,
                          color: Color(0xFF0F6259),
                          fontWeight: FontWeight.bold,
                        ),
                        recognizer: TapGestureRecognizer()..onTap = _openPrivacy,
                      ),
                      const TextSpan(
                        text: ' (OBBLIGATORIO)',
                        style: TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const Divider(height: 1),
              CheckboxListTile(
                value: _termsAccepted,
                onChanged: (val) {
                  setState(() {
                    _termsAccepted = val ?? false;
                  });
                },
                controlAffinity: ListTileControlAffinity.leading,
                checkColor: Colors.white,
                activeColor: const Color(0xFF247B75),
                title: RichText(
                  text: TextSpan(
                    style: Theme.of(context).textTheme.bodyMedium,
                    children: [
                      const TextSpan(text: 'Ho letto e accetto i '),
                      TextSpan(
                        text: 'Termini di servizio',
                        style: const TextStyle(
                          decoration: TextDecoration.underline,
                          color: Color(0xFF0F6259),
                          fontWeight: FontWeight.bold,
                        ),
                        recognizer: TapGestureRecognizer()..onTap = _openTerms,
                      ),
                      const TextSpan(
                        text: ' (OBBLIGATORIO)',
                        style: TextStyle(
                          color: Colors.red,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
