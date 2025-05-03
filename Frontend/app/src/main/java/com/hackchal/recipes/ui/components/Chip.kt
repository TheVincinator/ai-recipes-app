package com.hackchal.recipes.ui.components

import   androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import  androidx.compose.foundation.layout.Spacer
import   androidx.compose.foundation.layout.padding
import  androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import coil.request.ImageRequest

// shows little item thingy with picture and x button
@Composable
fun Chip(
    itemName: String,  // what to show
    whenXClicked: () -> Unit,  // when they click x
    modifier: Modifier = Modifier
) {
    val ctx = LocalContext.current
    val imgName = remember(itemName) { itemName.lowercase().replace(" ", "_") }
    val imgId = remember(imgName) {
        ctx.resources.getIdentifier(imgName, "drawable", ctx.packageName)
    }

    Row(
        modifier = modifier
            .clip(CircleShape)
            .background(Color.White)
            .padding(start=12.dp, end=12.dp, top=8.dp, bottom=8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // picture part
        if (imgId !=0) {
            SubcomposeAsyncImage(
                model = ImageRequest.Builder(ctx)
                    .data(imgId)
                    .build(),
                contentDescription = null,
                modifier = Modifier.size(24.dp).clip(CircleShape),
                loading = { CircularProgressIndicator(Modifier.size(24.dp), strokeWidth=2.dp, color=Color.Gray) },
                error = { Icon(androidx.compose.material.icons.Icons.Filled.Warning, "no image", Modifier.size(24.dp)) }
            )
        } else {
            Icon(androidx.compose.material.icons.Icons.Filled.Warning, "default", Modifier.size(24.dp))
        }

        Spacer(Modifier.width(8.dp))

        Text(text = itemName)

        Spacer(Modifier.width(4.dp))
        IconButton(
            onClick = whenXClicked,
            modifier = Modifier.size(16.dp)
        ) {
            Icon(
                Icons.Default.Close,
                "remove",
                modifier = Modifier.size(12.dp)
            )
        }
    }
}