package com.hackchal.recipes.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController

// shows recipe results
@Composable
fun OutputScreen(nav: NavHostController, dataFromPrev: String?) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var recipeText by remember { mutableStateOf("") }

    Box(Modifier.fillMaxSize()) {
        if (loading) {
            CircularProgressIndicator(Modifier.align(Alignment.Center))
        } else {
            Column(
                Modifier
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                error?.let {
                    Text(it, color=MaterialTheme.colorScheme.error, modifier=Modifier.padding(bottom=16.dp))
                }

                // show recipe lines
                recipeText.split("\n").forEach { line ->
                    when {
                        line.startsWith("## ") -> Text(
                            line.removePrefix("## "),
                            style=MaterialTheme.typography.headlineMedium,
                            modifier=Modifier.padding(vertical=8.dp)
                        )
                        line.startsWith("### ") -> Text(
                            line.removePrefix("### "),
                            style=MaterialTheme.typography.headlineSmall,
                            modifier=Modifier.padding(vertical=4.dp)
                        )
                        line.startsWith("- ") -> Text(
                            "• ${line.removePrefix("- ")}",
                            modifier=Modifier.padding(start=16.dp, bottom=4.dp)
                        )
                        line.isNotBlank() -> Text(line, modifier=Modifier.padding(bottom=8.dp))
                    }
                }

                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { nav.popBackStack() },
                    modifier=Modifier.fillMaxWidth()
                ) {
                    Text("Go Back")
                }
            }
        }
    }
}