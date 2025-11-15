import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../ui/widgets/brand_logo.dart';
import '../../ui/widgets/primary_button.dart';
import '../../services/user_service.dart';
import '../../screens/subscription_screen.dart';

/// 🔐 LOGIN PAGE MyPetCare con nuovo design
/// - Integrato con Firebase Auth + UserService
/// - Redirect intelligente (Owner vs Pro)
/// - Controllo abbonamento per PRO
/// - Link Registrati + Password dimenticata + Privacy/Termini
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _userService = UserService();
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    
    FocusScope.of(context).unfocus();
    setState(() => _isLoading = true);

    try {
      // 1. Login Firebase Auth
      final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      final uid = credential.user!.uid;

      if (kDebugMode) {
        debugPrint('✅ Login Firebase Auth riuscito: $uid');
      }

      // 2. Leggi i dati utente da Firestore tramite UserService
      final userData = await _userService.getUserData(uid);

      if (!mounted) return;

      if (userData == null) {
        // Utente non trovato in Firestore
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Profilo utente non trovato. Contatta il supporto.'),
            backgroundColor: Colors.red,
          ),
        );
        await FirebaseAuth.instance.signOut();
        setState(() => _isLoading = false);
        return;
      }

      final role = userData['role'] as String? ?? 'owner';

      if (kDebugMode) {
        debugPrint('✅ Ruolo utente: $role');
      }

      // 3. Redirect intelligente in base al ruolo
      if (role == 'pro') {
        // 🔍 Se è PRO, controlliamo anche lo stato abbonamento
        final proData = await _userService.getProData(uid);
        final subscriptionStatus = proData?['subscriptionStatus'] as String? ?? 'pending';

        if (kDebugMode) {
          debugPrint('✅ Stato abbonamento PRO: $subscriptionStatus');
        }

        if (subscriptionStatus != 'active') {
          // PRO senza abbonamento attivo → vai alla pagina abbonamento
          if (mounted) {
            context.go(SubscriptionScreen.routeName);
          }
          return;
        }

        // PRO con abbonamento attivo → home PRO
        if (mounted) {
          context.go('/pro/dashboard');
        }
      } else {
        // OWNER → home proprietario
        if (mounted) {
          context.go('/');
        }
      }
    } on FirebaseAuthException catch (e) {
      String errorMessage;
      
      switch (e.code) {
        case 'user-not-found':
          errorMessage = 'Utente non trovato. Verifica l\'email o registrati.';
          break;
        case 'wrong-password':
          errorMessage = 'Password errata. Riprova o usa "Password dimenticata".';
          break;
        case 'invalid-email':
          errorMessage = 'Email non valida.';
          break;
        case 'user-disabled':
          errorMessage = 'Account disabilitato. Contatta il supporto.';
          break;
        default:
          errorMessage = 'Errore di accesso: ${e.message}';
      }

      if (kDebugMode) {
        debugPrint('❌ FirebaseAuthException: ${e.code} - ${e.message}');
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ $errorMessage'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Errore imprevisto login: $e');
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Errore imprevisto: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Accedi'),
        backgroundColor: const Color(0xFF247B75),
        foregroundColor: Colors.white,
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // 🏠🐾 Logo Casa + Zampa (stesso dello splash)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            blurRadius: 16,
                            offset: const Offset(0, 8),
                            color: Colors.black.withOpacity(0.15),
                          ),
                        ],
                      ),
                      child: Image.asset(
                        'assets/images/my_pet_care_splash_logo.png',
                        width: 100,
                        height: 100,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Icon(
                          Icons.pets,
                          size: 100,
                          color: Color(0xFF247B75),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Nome app
                    Text(
                      'MyPetCare',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF247B75),
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tutti i servizi per il tuo pet',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.black54,
                          ),
                    ),
                    const SizedBox(height: 32),
                    
                    // Email Field
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        prefixIcon: Icon(Icons.email_outlined),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
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
                    const SizedBox(height: 16),
                    
                    // Password Field
                    TextFormField(
                      controller: _passwordController,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword 
                                ? Icons.visibility_outlined 
                                : Icons.visibility_off_outlined,
                          ),
                          onPressed: () {
                            setState(() => _obscurePassword = !_obscurePassword);
                          },
                        ),
                      ),
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _login(),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Inserisci la password';
                        }
                        if (value.length < 6) {
                          return 'Password troppo corta (min 6 caratteri)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 12),
                    
                    // Password dimenticata
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => context.push('/forgot'),
                        child: const Text('Password dimenticata?'),
                      ),
                    ),
                    const SizedBox(height: 8),
                    
                    // Pulsante Login
                    _isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : PrimaryButton(
                            label: 'Accedi',
                            onPressed: _login,
                          ),
                    const SizedBox(height: 24),
                    
                    // Link Registrazione
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text('Non hai un account?'),
                        TextButton(
                          onPressed: () => context.push('/register'),
                          child: const Text('Registrati'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    
                    // Link Privacy & Termini
                    Wrap(
                      alignment: WrapAlignment.center,
                      spacing: 8,
                      children: [
                        TextButton(
                          onPressed: () => context.push('/privacy'),
                          child: const Text('Privacy Policy'),
                        ),
                        const Text('•'),
                        TextButton(
                          onPressed: () => context.push('/terms'),
                          child: const Text('Termini di servizio'),
                        ),
                      ],
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
}
