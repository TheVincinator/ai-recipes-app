package com.hackchal.recipes.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.navigation.NavHostController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

@Composable
fun LoginScreen(navController: NavHostController) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSigningUp by remember { mutableStateOf(false) }
    val client = remember { OkHttpClient() }
    val jsonType = "application/json; charset=utf-8".toMediaType()
    val context = LocalContext.current

    fun handleAuth() {
        val jsonBody = when {
            isSigningUp ->
                """{"username":"$username","password":"$password","email":"$email"}"""
            else ->
                """{"username":"$username","password":"$password"}"""
        }

        val endpoint = if (isSigningUp) {
            "http://35.236.240.78/api/users/"
        } else {
            "http://35.236.240.78/api/auth/login/"
        }

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = makeNetworkCall(client, endpoint, jsonBody, jsonType)

                when {
                    response.isSuccessful -> navController.navigate("home")
                    response.code == 400 -> errorMessage = "Invalid request format"
                    response.code == 401 -> errorMessage = "Invalid credentials"
                    response.code == 409 -> errorMessage = "User already exists"
                    else -> errorMessage = "Error: ${response.code}"
                }
            } catch (e: Exception) {
                errorMessage = "Connection error: ${e.message}"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Column(
            modifier = Modifier
                .background(color = Color(0xFF006400))
                .statusBarsPadding()
                .fillMaxWidth()
        ) {
            Text(
                text = if (isSigningUp) "Sign Up" else "Login",
                modifier = Modifier.padding(16.dp),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }

        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (isSigningUp) {
                TextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            TextField(
                value = username,
                onValueChange = { username = it },
                label = { Text("Username") },
                modifier = Modifier.fillMaxWidth()
            )

            TextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password") },
                visualTransformation = PasswordVisualTransformation(),
                modifier = Modifier.fillMaxWidth()
            )

            errorMessage?.let {
                Text(it, color = Color.Red)
            }

            Button(
                onClick = { handleAuth() },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isSigningUp) Color(0xFF228B22) else Color(0xFF006400)
                )
            ) {
                Text(if (isSigningUp) "Create Account" else "Login")
            }

            Button(
                onClick = { isSigningUp = !isSigningUp },
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color.LightGray)
            ) {
                Text(if (isSigningUp) "Already have an account? Login" else "Need an account? Sign Up")
            }
        }
    }
}

private suspend fun makeNetworkCall(
    client: OkHttpClient,
    url: String,
    body: String,
    mediaType: okhttp3.MediaType
) = withContext(Dispatchers.IO) {
    val request = Request.Builder()
        .url(url)
        .post(body.toRequestBody(mediaType))
        .build()

    client.newCall(request).execute()
}