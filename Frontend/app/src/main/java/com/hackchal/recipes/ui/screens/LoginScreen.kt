package com.hackchal.recipes.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.navigation.NavHostController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL

@Composable
fun LoginScreen(navController: NavHostController) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isSigningUp by remember { mutableStateOf(false) }

    fun makeRequest(urlString: String, body: String, onSuccess: () -> Unit) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url = URL(urlString)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true

                connection.outputStream.use { os ->
                    os.write(body.toByteArray())
                    os.flush()
                }

                val responseCode = connection.responseCode
                if (responseCode in 200..299) {
                    onSuccess()
                } else {
                    errorMessage = "Error: $responseCode ${connection.responseMessage}"
                }
            } catch (e: Exception) {
                errorMessage = "Error: ${e.message}"
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Column(
            modifier = Modifier
                .background(color = Color(0xFF006400).copy(alpha = 0.9f))
                .statusBarsPadding()
                .fillMaxWidth()
        ) {
            Spacer(Modifier.size(20.dp))
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
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Email", fontWeight = FontWeight.Bold)
                    TextField(
                        value = email,
                        onValueChange = { email = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        placeholder = { Text("Enter your email") }
                    )
                }
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Username", fontWeight = FontWeight.Bold)
                TextField(
                    value = username,
                    onValueChange = { username = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("Enter your username") }
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Password", fontWeight = FontWeight.Bold)
                TextField(
                    value = password,
                    onValueChange = { password = it },
                    modifier = Modifier.fillMaxWidth(),
                    visualTransformation = PasswordVisualTransformation(),
                    singleLine = true,
                    placeholder = { Text("Enter your password") }
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Email", fontWeight = FontWeight.Bold)
                TextField(
                    value = email,
                    onValueChange = { email = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    placeholder = { Text("Enter your email") }
                )
            }

            errorMessage?.let {
                Text(it, color = Color.Red)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (isSigningUp) {
                    Button(
                        onClick = {
                            val body = """
                                {
                                    "username": "$username",
                                    "password": "$password",
                                    "email": "$email"
                                }
                            """.trimIndent()

                            makeRequest("http://10.0.2.2:5000/api/users/", body) {
                                navController.navigate("home")
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF228B22))
                    ) {
                        Text("Create Account")
                    }

                    Button(
                        onClick = { isSigningUp = false },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Gray)
                    ) {
                        Text("Back")
                    }
                } else {
                    Button(
                        onClick = {
                            val body = """
                                {
                                    "username": "$username",
                                    "password": "$password"
                                }
                            """.trimIndent()

                            makeRequest("http://10.0.2.2:5000/api/auth/login/", body) {
                                navController.navigate("home")
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF006400))
                    ) {
                        Text("Login")
                    }

                    Button(
                        onClick = { isSigningUp = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF228B22))
                    ) {
                        Text("Sign Up")
                    }
                }
            }
        }
    }
}

