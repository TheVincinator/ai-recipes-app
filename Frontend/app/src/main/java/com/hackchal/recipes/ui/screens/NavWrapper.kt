package com.hackchal.recipes.ui.screens

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

@Composable
fun NavWrapper() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        // Home
        composable("home") {
            HomeScreen(
                navController=navController,
                Search = { _, _ -> }
            )
        }
        composable("login") {
            LoginScreen(
                navController= navController
            )
        }

        //output Screen
        composable( "output") {
            OutputScreen(
                navController = navController
            )
        }
    }
}