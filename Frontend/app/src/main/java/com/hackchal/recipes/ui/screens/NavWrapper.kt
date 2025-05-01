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
        // Login/Signup Screen
        composable("login") {
            LoginScreen(
                navController = navController,
                onLogin = { username, password ->
                    //Login API here
                    if (isValidLogin(username, password)) {
                        navController.navigate("home") {
                            popUpTo("login") { inclusive = true }
                        }
                    }
                },
                onSignUp = { username, password ->
                    // Add your actual signup logic here
                    if (createNewAccount(username, password)) { // Implement this
                        navController.navigate("home") {
                            popUpTo("login") { inclusive = true }
                        }
                    }
                }
            )
        }

        // Home Screen
        composable("home") {
            HomeScreen(
                navController = navController,
                Search = { ingredients, restrictions ->
                    // Handle search and navigate to results
                    navController.navigate("output")
                }
            )
        }

        // Output Screen
        composable("output") {
            OutputScreen(
                navController = navController
            )
        }
    }
}

// Replace with real authentication:
private fun isValidLogin(username: String, password: String): Boolean {
    return username.isNotBlank() && password.length >= 6
}

private fun createNewAccount(username: String, password: String): Boolean {
    return username.isNotBlank() && password.length >= 6
}