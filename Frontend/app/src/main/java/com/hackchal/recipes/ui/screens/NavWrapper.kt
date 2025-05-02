package com.hackchal.recipes.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Composable
fun NavWrapper() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "login"
    ) {
        composable("login") {
            LoginScreen(
                navController = navController,
            )
        }

        composable("home") {
            HomeScreen(navController = navController)
        }

        composable("output/{ingredients}") { backStackEntry ->
            val ingredients = backStackEntry.arguments?.getString("ingredients") ?: ""
            OutputScreen(ingredients = ingredients)
        }
    }
}