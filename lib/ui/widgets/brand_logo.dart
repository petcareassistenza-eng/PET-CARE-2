import 'package:flutter/material.dart';

/// 🏠🐾 BRAND LOGO - Logo My Pet Care con Casa + Zampa
/// Usato in Login, Registrazione e altre pagine
class BrandLogo extends StatelessWidget {
  final double size;
  const BrandLogo({super.key, this.size = 160});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 🏠🐾 Logo Casa + Zampa con container bianco
        Container(
          padding: EdgeInsets.all(size * 0.15),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(size * 0.15),
            boxShadow: [
              BoxShadow(
                blurRadius: 16,
                offset: const Offset(0, 8),
                color: Colors.black.withValues(alpha: 0.15),
              ),
            ],
          ),
          child: Image.asset(
            'assets/images/my_pet_care_splash_logo.png',
            width: size,
            height: size,
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) {
              // Fallback se l'immagine non è disponibile
              return Icon(
                Icons.pets,
                size: size,
                color: const Color(0xFF247B75),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        
        // Nome app
        const Text(
          'MY PET CARE',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Color(0xFF247B75),
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 6),
        
        // Tagline
        Text(
          'Il tuo pet, il nostro impegno',
          style: TextStyle(
            fontSize: 15,
            color: Colors.grey.shade600,
          ),
        ),
      ],
    );
  }
}
