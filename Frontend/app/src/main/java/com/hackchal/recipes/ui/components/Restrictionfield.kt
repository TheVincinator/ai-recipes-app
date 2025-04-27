package com.hackchal.recipes.ui.components

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview

@Composable
fun DietaryRestrictionInput(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier 
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange, 
        label = {Text(text ="Dietary restrictions") },
        placeholder = {Text(text ="e.g., vegetarian")},
        modifier = modifier.fillMaxWidth()
    )
}

@Preview
@Composable
fun DietaryRestrictionInputPreview() {
    DietaryRestrictionInput(
        value = "Vegetarian" ,
        onValueChange = {}
    )
}