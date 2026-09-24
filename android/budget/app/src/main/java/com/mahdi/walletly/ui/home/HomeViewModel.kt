package com.mahdi.walletly.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mahdi.walletly.data.Currency
import com.mahdi.walletly.data.Expense
import com.mahdi.walletly.data.ExpenseWithCategory
import com.mahdi.walletly.data.UserPreferences
import com.mahdi.walletly.data.WalletRepository
import com.mahdi.walletly.ui.common.DateRange
import com.mahdi.walletly.ui.common.Period
import com.mahdi.walletly.ui.common.rangeFor
import com.mahdi.walletly.ui.common.shift
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

data class HomeUiState(
    val period: Period = Period.DAILY,
    val anchorDate: LocalDate = LocalDate.now(),
    val range: DateRange = Period.DAILY.rangeFor(LocalDate.now()),
    val items: List<ExpenseWithCategory> = emptyList(),
    val totalUsd: Double = 0.0,
    val totalLbp: Double = 0.0,
    val exchangeRate: Double = UserPreferences.DEFAULT_EXCHANGE_RATE
)

class HomeViewModel(private val repository: WalletRepository) : ViewModel() {

    private val period = MutableStateFlow(Period.DAILY)
    private val anchorDate = MutableStateFlow(LocalDate.now())

    val uiState: StateFlow<HomeUiState> =
        combine(period, anchorDate) { p, a -> p to a }
            .flatMapLatest { (p, a) ->
                val range = p.rangeFor(a)
                combine(
                    repository.expensesBetween(range.start, range.end),
                    repository.categories,
                    repository.preferences.exchangeRate
                ) { expenses, categories, rate ->
                    val categoryMap = categories.associateBy { it.id }
                    val items = expenses
                        .map { ExpenseWithCategory(it, categoryMap[it.categoryId]) }
                        .sortedByDescending { it.expense.date }
                    HomeUiState(
                        period = p,
                        anchorDate = a,
                        range = range,
                        items = items,
                        totalUsd = expenses.sumOf { repository.convert(it.amount, it.currency, Currency.USD, rate) },
                        totalLbp = expenses.sumOf { repository.convert(it.amount, it.currency, Currency.LBP, rate) },
                        exchangeRate = rate
                    )
                }
            }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), HomeUiState())

    fun setPeriod(newPeriod: Period) {
        period.value = newPeriod
    }

    fun goToPrevious() {
        anchorDate.value = period.value.shift(anchorDate.value, -1)
    }

    fun goToNext() {
        anchorDate.value = period.value.shift(anchorDate.value, 1)
    }

    fun goToToday() {
        anchorDate.value = LocalDate.now()
    }

    fun deleteExpense(expense: Expense) {
        viewModelScope.launch { repository.deleteExpense(expense) }
    }
}
