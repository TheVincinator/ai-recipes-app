package com.hackchal.recipes.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.hackchal.recipes.ui.components.Chip
import com.hackchal.recipes.ui.components.FoodField

// main screen where you add stuff
@Composable
fun HomeScreen(navController: NavHostController) {
    var stuffList by remember { mutableStateOf(listOf<String>()) }
    var newStuff by remember { mutableStateOf("") }
    var badStuff by remember { mutableStateOf(listOf<String>()) }
    var newBad by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    Column(Modifier.fillMaxSize()) {
        // green bar at top
        Column(
            Modifier
                .background(Color(0xFF006400))
                .statusBarsPadding()
                .fillMaxWidth()
        ) {
            Text(
                "Home",
                Modifier.padding(16.dp),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }

        Column(Modifier.padding(16.dp).fillMaxWidth()) {
            // ingredients section
            Text("Ingredients", style=MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))

            FoodField(
                value = newStuff,
                onValueChange = { newStuff = it },
                onAdd = {
                    if (newStuff.isNotBlank()) {
                        stuffList = stuffList + newStuff
                        newStuff = ""
                    }
                },
                label = "Add item"
            )

            Spacer(Modifier.height(16.dp))

            // list of items
            if (stuffList.isNotEmpty()) {
                LazyColumn(Modifier.fillMaxWidth().padding(vertical=8.dp)) {
                    items(stuffList) { item ->
                        Chip(
                            itemName = item,
                            whenXClicked = { stuffList = stuffList - item },
                            modifier = Modifier.padding(vertical=4.dp)
                        )
                    }
                }
            }

            // allergies part
            Spacer(Modifier.height(16.dp))
            Text("Allergies", style=MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(8.dp))

            FoodField(
                value = newBad,
                onValueChange = { newBad = it },
                onAdd = {
                    if (newBad.isNotBlank()) {
                        badStuff = badStuff + newBad
                        newBad = ""
                    }
                },
                label = "Add allergy"
            )

            Spacer(Modifier.height(16.dp))

            // allergy list
            if (badStuff.isNotEmpty()) {
                LazyColumn(Modifier.fillMaxWidth().padding(vertical=8.dp)) {
                    items(badStuff) { allergy ->
                        Chip(
                            itemName = allergy,
                            whenXClicked = { badStuff = badStuff - allergy },
                            modifier = Modifier.padding(vertical=4.dp)
                        )
                    }
                }
            }

            // error messages
            error?.let {
                Text(it, color=MaterialTheme.colorScheme.error, modifier=Modifier.padding(vertical=8.dp))
            }

            // big green button
            Button(
                onClick = { navController.navigate("output/") },  // skip to results
                modifier = Modifier.fillMaxWidth().padding(top=16.dp),
                colors = ButtonDefaults.buttonColors(containerColor=Color(0xFF006400))
            ) {
                Text("Make Recipes!")
            }
        }
    }
}