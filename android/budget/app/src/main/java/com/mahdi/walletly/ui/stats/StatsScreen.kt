package com.mahdi.walletly.ui.stats

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.mahdi.walletly.data.Currency
import com.mahdi.walletly.ui.common.Period
import com.mahdi.walletly.ui.common.categoryColorPalette
import com.mahdi.walletly.ui.common.formatAmount
import com.mahdi.walletly.ui.common.label
import com.mahdi.walletly.ui.components.BarChart
import com.mahdi.walletly.ui.components.BarPoint
import com.mahdi.walletly.ui.components.DonutChart
import com.mahdi.walletly.ui.components.DonutSlice
import com.mahdi.walletly.ui.rememberWalletRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatsScreen() {
    val repository = rememberWalletRepository()
    val viewModel: StatsViewModel = viewModel(
        factory = viewModelFactory { initializer { StatsViewModel(repository) } }
    )
    val state by viewModel.uiState.collectAsState()
    val trend by viewModel.trend.collectAsState()

    Scaffold(topBar = { TopAppBar(title = { Text("Stats") }) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
        ) {
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                Period.entries.forEachIndexed { index, period ->
                    SegmentedButton(
                        selected = state.period == period,
                        onClick = { viewModel.setPeriod(period) },
                        shape = SegmentedButtonDefaults.itemShape(index = index, count = Period.entries.size)
                    ) {
                        Text(period.label)
                    }
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                IconButton(onClick = { viewModel.goToPrevious() }) {
                    Icon(Icons.Filled.ChevronLeft, contentDescription = "Previous")
                }
                Text(
                    text = state.range.label(state.period),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
                IconButton(onClick = { viewModel.goToNext() }) {
                    Icon(Icons.Filled.ChevronRight, contentDescription = "Next")
                }
            }

            Text(
                "Spend by category",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(start = 16.dp, top = 16.dp)
            )

            Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                val slices = state.breakdown.mapIndexed { index, breakdown ->
                    DonutSlice(
                        label = breakdown.category?.name ?: "Uncategorized",
                        value = breakdown.totalUsd,
                        color = colorFor(breakdown.category?.colorHex, index)
                    )
                }
                DonutChart(slices = slices)
            }

            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                state.breakdown.forEachIndexed { index, breakdown ->
                    LegendRow(
                        name = breakdown.category?.name ?: "Uncategorized",
                        amount = breakdown.totalUsd,
                        color = colorFor(breakdown.category?.colorHex, index)
                    )
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

            Text(
                "Trend (last 7 ${state.period.label.lowercase()}s)",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(start = 16.dp)
            )

            BarChart(
                points = trend.map { BarPoint(it.label, it.totalUsd) },
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}

@Composable
private fun LegendRow(name: String, amount: Double, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(color))
        Text(name, modifier = Modifier.padding(start = 8.dp).weight(1f))
        Text(formatAmount(amount, Currency.USD), style = MaterialTheme.typography.bodyMedium)
    }
}

private fun colorFor(colorHex: String?, fallbackIndex: Int): Color {
    val hex = colorHex ?: categoryColorPalette[fallbackIndex % categoryColorPalette.size]
    return runCatching { Color(android.graphics.Color.parseColor(hex)) }
        .getOrDefault(Color.Gray)
}
