package com.mahdi.walletly.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

data class BarPoint(val label: String, val value: Double)

@Composable
fun BarChart(
    points: List<BarPoint>,
    modifier: Modifier = Modifier
) {
    val maxValue = points.maxOfOrNull { it.value }?.takeIf { it > 0 } ?: 1.0

    Column(modifier = modifier.fillMaxWidth()) {
        Canvas(modifier = Modifier.fillMaxWidth().height(140.dp)) {
            if (points.isEmpty()) return@Canvas
            val barSlot = size.width / points.size
            val barWidth = barSlot * 0.5f
            points.forEachIndexed { index, point ->
                val barHeight = (point.value / maxValue * size.height).toFloat()
                val left = index * barSlot + (barSlot - barWidth) / 2f
                drawRoundRect(
                    color = androidx.compose.ui.graphics.Color(0xFF1B5E20),
                    topLeft = Offset(left, size.height - barHeight),
                    size = androidx.compose.ui.geometry.Size(barWidth, barHeight),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(6f, 6f)
                )
            }
            drawLine(
                color = androidx.compose.ui.graphics.Color.Gray.copy(alpha = 0.4f),
                start = Offset(0f, size.height),
                end = Offset(size.width, size.height),
                strokeWidth = 2f
            )
        }
        androidx.compose.foundation.layout.Row(modifier = Modifier.fillMaxWidth()) {
            points.forEach { point ->
                Text(
                    text = point.label,
                    style = MaterialTheme.typography.labelSmall,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.weight(1f).padding(top = 4.dp)
                )
            }
        }
    }
}
