package com.mahdi.walletly.data

import android.content.Context
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "walletly_prefs")

class UserPreferences(private val context: Context) {

    private object Keys {
        val EXCHANGE_RATE = doublePreferencesKey("lbp_per_usd")
        val DEFAULT_CURRENCY = stringPreferencesKey("default_currency")
    }

    companion object {
        const val DEFAULT_EXCHANGE_RATE = 89500.0
    }

    val exchangeRate: Flow<Double> = context.dataStore.data.map {
        it[Keys.EXCHANGE_RATE] ?: DEFAULT_EXCHANGE_RATE
    }

    val defaultCurrency: Flow<Currency> = context.dataStore.data.map {
        it[Keys.DEFAULT_CURRENCY]?.let { name -> runCatching { Currency.valueOf(name) }.getOrNull() }
            ?: Currency.USD
    }

    suspend fun setExchangeRate(lbpPerUsd: Double) {
        context.dataStore.edit { it[Keys.EXCHANGE_RATE] = lbpPerUsd }
    }

    suspend fun setDefaultCurrency(currency: Currency) {
        context.dataStore.edit { it[Keys.DEFAULT_CURRENCY] = currency.name }
    }
}
