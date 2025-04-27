package com.hackchal.recipes.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

@Composable
fun Chip(
    text: String,
    onClose: () -> Unit, 
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .clip(CircleShape)
            .background(color = Color.White)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment=Alignment.CenterVertically
    ) {
        Text(text =text)

        Spacer(Modifier.width(4.dp))
        IconButton(
            onClick = onClose,
            modifier = Modifier.size(16.dp)
        ) {

            Icon(
                Icons.Default.Close,
                contentDescription = "Remove",
                modifier = Modifier.size(12.dp)
            )
        }
    }
}

@Preview
@Composable
fun ChipPreview() {
    Chip(text = "Tomato", onClose = {})
}