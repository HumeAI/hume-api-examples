import 'package:flutter/material.dart';

// From CSS variables on hume.ai
const Color white = Color.fromRGBO(255, 255, 255, 1);
const Color humeBlack900 = Color.fromRGBO(26, 26, 26, 1);
const Color humeTan400 = Color.fromRGBO(255, 244, 232, 1);
const Color accentOrange200 = Color.fromRGBO(255, 219, 176, 1);
const Color accentBlue200 = Color.fromRGBO(209, 226, 243, 1);

ThemeData appTheme = ThemeData(
  scaffoldBackgroundColor: humeTan400,
  colorScheme: ColorScheme.light(
  primary: white,
  inversePrimary: accentOrange200,
  surface: humeBlack900,
  ),
);
