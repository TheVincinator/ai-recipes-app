package com.hackchal.recipes.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
fun FoodField(
    value: String,
    onValueChange: (String) -> Unit,
    onAdd: () -> Unit,
    label: String,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(color = Color.White)
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = {Text(text = label)},
            modifier = Modifier.weight(1f),


        )

        Spacer(modifier = Modifier.width(10.dp))

        Button(
            onClick = onAdd,
            modifier = Modifier
                .padding(top = 8.dp)
                .size(75.dp, 55.dp),
            shape = RoundedCornerShape(7.dp),
            colors = ButtonColors(
                containerColor = Color(0xFF006400).copy(alpha = 2.5f),
                contentColor = Color.White,
                disabledContainerColor = Color.White,
                disabledContentColor =Color.White,
            )

        ) {
            Text(text="Add")
        }
    }
}

@Preview
@Composable
fun FoodFieldPreview() {
    FoodField(
        value = "Tomato",
        onValueChange = {},
        onAdd = {},
        label = "Enter ingredient"
    )
}