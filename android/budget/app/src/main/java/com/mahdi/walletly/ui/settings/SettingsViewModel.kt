package com.mahdi.walletly.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mahdi.walletly.data.Currency
import com.mahdi.walletly.data.WalletRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(private val repository: WalletRepository) : ViewModel() {

    val exchangeRate: StateFlow<Double> = repository.preferences.exchangeRate
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), com.mahdi.walletly.data.UserPreferences.DEFAULT_EXCHANGE_RATE)

    val defaultCurrency: StateFlow<Currency> = repository.preferences.defaultCurrency
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), Currency.USD)

    fun setExchangeRate(rate: Double) {
        viewModelScope.launch { repository.preferences.setExchangeRate(rate) }
    }

    fun setDefaultCurrency(currency: Currency) {
        viewModelScope.launch { repository.preferences.setDefaultCurrency(currency) }
    }
}
