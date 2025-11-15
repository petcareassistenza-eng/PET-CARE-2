import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../features/auth/login_page.dart';

/// 🎨 SPLASH SCREEN con Auto-Navigate dopo 3 secondi
/// Logo visibile per tutta la durata dello splash
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    
    // Fade-in animation
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );
    
    _controller.forward();
    
    // ✅ Auto-navigate dopo 3 secondi (logo visibile tutto il tempo)
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginPage()),
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppBrand.primary,
      body: SafeArea(
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 🏠🐾 Logo centrale con ombra
                Container(
                  padding: const EdgeInsets.all(AppBrand.spacingL),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius:
                        BorderRadius.circular(AppBrand.borderRadius * 2),
                    boxShadow: [
                      BoxShadow(
                        blurRadius: 24,
                        offset: const Offset(0, 12),
                        color: Colors.black.withValues(alpha: 0.25),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/my_pet_care_splash_logo.png',
                    width: 140,
                    height: 140,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.pets,
                      size: 140,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: AppBrand.spacingL),
                
                // Nome app
                const Text(
                  'MY PET CARE',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 2.0,
                  ),
                ),
                const SizedBox(height: AppBrand.spacingS),
                
                // Tagline
                Text(
                  'Il tuo pet, il nostro impegno',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white.withValues(alpha: 0.9),
                  ),
                ),
                const SizedBox(height: AppBrand.spacingXL),
                
                // Loading indicator
                const SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
