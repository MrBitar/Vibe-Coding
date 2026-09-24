package com.mahdi.walletly.ui.common

import com.mahdi.walletly.data.Currency
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

fun formatAmount(amount: Double, currency: Currency): String {
    val formatter = NumberFormat.getNumberInstance(Locale.US)
    return when (currency) {
        Currency.USD -> {
            formatter.minimumFractionDigits = 2
            formatter.maximumFractionDigits = 2
            "${currency.symbol}${formatter.format(amount)}"
        }
        Currency.LBP -> {
            formatter.minimumFractionDigits = 0
            formatter.maximumFractionDigits = 0
            "${formatter.format(amount)} ${currency.symbol}"
        }
    }
}

fun DateRange.label(period: Period): String = when (period) {
    Period.DAILY -> start.format(DateTimeFormatter.ofPattern("EEE, MMM d"))
    Period.WEEKLY -> "${start.format(DateTimeFormatter.ofPattern("MMM d"))} - ${end.format(DateTimeFormatter.ofPattern("MMM d"))}"
    Period.MONTHLY -> start.month.getDisplayName(TextStyle.FULL, Locale.getDefault()) + " " + start.year
}

fun LocalDate.shortLabel(): String = format(DateTimeFormatter.ofPattern("MMM d, yyyy"))

fun Period.bucketLabel(date: LocalDate): String = when (this) {
    Period.DAILY -> date.format(DateTimeFormatter.ofPattern("EEE d"))
    Period.WEEKLY -> date.format(DateTimeFormatter.ofPattern("MMM d"))
    Period.MONTHLY -> date.format(DateTimeFormatter.ofPattern("MMM"))
}
