package com.hackchal.recipes.ui.screens


import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.navigation.NavHostController

@Composable
fun HomeScreen(navController: NavHostController) {
    var ingredients by remember { mutableStateOf(listOf<String>()) }
    var newIngredient by remember { mutableStateOf("") }

    Column(modifier = Modifier.padding(16.dp)) {
        // Input field
        TextField(
            value = newIngredient,
            onValueChange = { newIngredient = it },
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Add ingredients (e.g. eggs, milk)") }
        )

        Button(
            onClick = {
                if (newIngredient.isNotBlank()) {
                    ingredients = ingredients + newIngredient
                    newIngredient = ""
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Add Ingredient")
        }

        // Fixed LazyColumn items
        LazyColumn {
            items(ingredients.size) { index ->
                Text(
                    text = "• ${ingredients[index]}",
                    modifier = Modifier.padding(8.dp)
                )
            }
        }

        // Generate Recipes Button
        Button(
            onClick = {
                navController.navigate("output/${ingredients.joinToString(",")}")
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Generate Recipes")
        }
    }
}