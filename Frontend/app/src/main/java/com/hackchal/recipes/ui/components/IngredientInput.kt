package com.hackchal.recipes.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
fun IngredientInputField(
    value: String,
    onValueChange: (String) -> Unit,
    onAdd: () -> Unit,
    modifier: Modifier = Modifier 
) {
    Row(modifier = modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = {Text(text = "Enter ingredient")},
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            modifier = Modifier.weight(1f)
        )


        Button(
            onClick = onAdd,
            modifier = Modifier.padding(top = 8.dp)
        ) {
            Text(text="Add")
        }
    }
}

@Preview
@Composable
fun IngredientInputFieldPreview() {
    IngredientInputField(
        value = "Tomato",
        onValueChange = {},
        onAdd = {}
    )
}