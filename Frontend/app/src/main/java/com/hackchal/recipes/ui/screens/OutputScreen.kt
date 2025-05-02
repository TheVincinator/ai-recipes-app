package com.hackchal.recipes.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL

@Composable
fun OutputScreen(ingredients: String) {
    var recipeText by remember { mutableStateOf("Generating recipes...") }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val result = withContext(Dispatchers.IO) {
                generateRecipesSimple(ingredients.split(","))
            }
            recipeText = result
            isLoading = false
        } catch (e: Exception) {
            error = e.message ?: "Unknown error"
            isLoading = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (isLoading) {
            CircularProgressIndicator(Modifier.align(Alignment.Center))
        } else {
            Column(modifier = Modifier.padding(16.dp)) {
                if (error != null) {
                    Text("Error: $error", color = Color.Red)
                } else {
                    Text(recipeText)
                }
            }
        }
    }
}

private suspend fun generateRecipesSimple(ingredients: List<String>): String {
    val url = URL("http://10.0.2.2:5000/api/recipe-suggestions") // Your Flask endpoint
    val connection = url.openConnection() as HttpURLConnection

    return try {
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.doOutput = true

        val jsonInput = """
            {
                "ingredients": ${ingredients.toJsonString()}
            }
        """.trimIndent()

        connection.outputStream.use { os ->
            os.write(jsonInput.toByteArray())
            os.flush()
        }

        connection.inputStream.use { it.reader().readText() }
    } finally {
        connection.disconnect()
    }
}

private fun List<String>.toJsonString(): String {
    return this.joinToString(", ", "[", "]") { "\"$it\"" }
}