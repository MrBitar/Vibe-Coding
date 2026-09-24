package com.mahdi.walletly.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.mahdi.walletly.data.Currency
import com.mahdi.walletly.ui.rememberWalletRepository

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen() {
    val repository = rememberWalletRepository()
    val viewModel: SettingsViewModel = viewModel(
        factory = viewModelFactory { initializer { SettingsViewModel(repository) } }
    )
    val exchangeRate by viewModel.exchangeRate.collectAsState()
    val defaultCurrency by viewModel.defaultCurrency.collectAsState()

    var rateText by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(exchangeRate) {
        if (rateText.isEmpty()) rateText = exchangeRate.toLong().toString()
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Settings") }) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Exchange rate", style = MaterialTheme.typography.titleMedium)
            Text(
                "How many Lebanese Pounds equal 1 US Dollar. Update this whenever the rate changes.",
                style = MaterialTheme.typography.bodyMedium
            )
            OutlinedTextField(
                value = rateText,
                onValueChange = { if (it.isEmpty() || it.matches(Regex("^\\d*$"))) rateText = it },
                label = { Text("LBP per 1 USD") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth()
            )
            Button(
                onClick = { rateText.toDoubleOrNull()?.let { viewModel.setExchangeRate(it) } },
                enabled = rateText.toDoubleOrNull() != null && rateText.toDoubleOrNull()!! > 0,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save rate")
            }

            Text("Default currency", style = MaterialTheme.typography.titleMedium)
            Text(
                "Which currency totals are shown in first across the app.",
                style = MaterialTheme.typography.bodyMedium
            )
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                Currency.entries.forEachIndexed { index, currency ->
                    SegmentedButton(
                        selected = defaultCurrency == currency,
                        onClick = { viewModel.setDefaultCurrency(currency) },
                        shape = SegmentedButtonDefaults.itemShape(index = index, count = Currency.entries.size)
                    ) {
                        Text(currency.label)
                    }
                }
            }
        }
    }
}
