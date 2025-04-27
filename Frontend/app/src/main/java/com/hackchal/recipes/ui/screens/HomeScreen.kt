package com.hackchal.recipes.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.hackchal.recipes.ui.components.Chip
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import com.hackchal.recipes.ui.components.FoodField

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HomeScreen(
    Search: (ingredients: List<String>, restrictions: String) -> Unit
) {
    var ingredientInput by remember { mutableStateOf("") }
    val ingredients = remember { mutableStateListOf<String>() }
    var restrictionInput by remember { mutableStateOf("") }
    val restrictions = remember { mutableStateListOf<String>() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(),
        horizontalAlignment = Alignment.CenterHorizontally,

    ) {
        //Title
        Column(
            modifier = Modifier
                .background(color = Color(0xFF006400).copy(alpha = 0.9f))
                .statusBarsPadding()
                .fillMaxWidth()
        ) {
            Spacer(Modifier.size(20.dp))
            Text(
                text = "Recipe Generator",
                modifier = Modifier.padding(16.dp),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }


        //Input Fields
        Column(
            verticalArrangement = Arrangement.spacedBy(0.dp),
            modifier = Modifier
                .padding(16.dp)
        ) {

            //Ingredients
            Text(
                text = "Type an ingredient and add it to the list",
                fontWeight = FontWeight.Bold,
            )
            FoodField(
                value = ingredientInput,
                onValueChange = { ingredientInput = it },
                onAdd = {
                    if (ingredientInput.isNotBlank()) {
                        ingredients.add(ingredientInput.trim())
                        ingredientInput = ""
                    }

                },
                label = "banana, ground beef, ..."
            )

            Spacer(Modifier.size(30.dp))
            
            //Diets
            Text(
                "Enter your diet and tap the button",
                fontWeight = FontWeight.Bold,)
            FoodField(
                value = restrictionInput,
                onValueChange = { restrictionInput = it },
                onAdd = {
                    if (restrictionInput.isNotBlank()) {
                        restrictions.add(restrictionInput.trim())
                        restrictionInput = ""
                    }

                },
                label = "vegan, keto, etc"
            )
        }

        //Chips
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {

            Text(
                text = "Entered:",
                fontWeight = FontWeight.Bold,
            )

            //Ingredients
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                ingredients.forEach { ingredient ->
                    Chip(
                        text = ingredient,
                        onClose = { ingredients.remove(ingredient) }
                    )
                }
            }

            //Diets
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                restrictions.forEach { restriction ->
                    Chip(
                        text = restriction,
                        onClose = { restrictions.remove(restriction) }
                    )
                }
            }
        }
    }
}

@Preview
@Composable
fun MainScreenPreview(){
    HomeScreen(Search = { _, _ -> })
}