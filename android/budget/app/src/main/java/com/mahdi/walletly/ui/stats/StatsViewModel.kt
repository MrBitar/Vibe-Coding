package com.mahdi.walletly.ui.stats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mahdi.walletly.data.Category
import com.mahdi.walletly.data.Currency
import com.mahdi.walletly.data.WalletRepository
import com.mahdi.walletly.ui.common.DateRange
import com.mahdi.walletly.ui.common.Period
import com.mahdi.walletly.ui.common.bucketLabel
import com.mahdi.walletly.ui.common.rangeFor
import com.mahdi.walletly.ui.common.shift
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate

data class CategoryBreakdown(val category: Category?, val totalUsd: Double)

data class TrendPoint(val label: String, val totalUsd: Double)

data class StatsUiState(
    val period: Period = Period.DAILY,
    val anchorDate: LocalDate = LocalDate.now(),
    val range: DateRange = Period.DAILY.rangeFor(LocalDate.now()),
    val breakdown: List<CategoryBreakdown> = emptyList(),
    val totalUsd: Double = 0.0
)

private const val TREND_BUCKET_COUNT = 6L

class StatsViewModel(private val repository: WalletRepository) : ViewModel() {

    private val period = MutableStateFlow(Period.DAILY)
    private val anchorDate = MutableStateFlow(LocalDate.now())

    val uiState: StateFlow<StatsUiState> =
        combine(period, anchorDate) { p, a -> p to a }
            .flatMapLatest { (p, a) ->
                val range = p.rangeFor(a)
                combine(
                    repository.expensesBetween(range.start, range.end),
                    repository.categories,
                    repository.preferences.exchangeRate
                ) { expenses, categories, rate ->
                    val categoryMap = categories.associateBy { it.id }
                    val breakdown = expenses
                        .groupBy { it.categoryId }
                        .map { (catId, list) ->
                            CategoryBreakdown(
                                category = categoryMap[catId],
                                totalUsd = list.sumOf { repository.convert(it.amount, it.currency, Currency.USD, rate) }
                            )
                        }
                        .sortedByDescending { it.totalUsd }
                    StatsUiState(
                        period = p,
                        anchorDate = a,
                        range = range,
                        breakdown = breakdown,
                        totalUsd = breakdown.sumOf { it.totalUsd }
                    )
                }
            }
            .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), StatsUiState())

    private val _trend = MutableStateFlow<List<TrendPoint>>(emptyList())
    val trend: StateFlow<List<TrendPoint>> = _trend.asStateFlow()

    init {
        viewModelScope.launch {
            combine(period, anchorDate) { p, a -> p to a }.collectLatest { (p, a) ->
                val rate = repository.currentExchangeRate()
                val points = (TREND_BUCKET_COUNT downTo 0L).map { offset ->
                    val bucketAnchor = p.shift(a, -offset)
                    val range = p.rangeFor(bucketAnchor)
                    val expenses = repository.expensesBetween(range.start, range.end).first()
                    val total = expenses.sumOf { repository.convert(it.amount, it.currency, Currency.USD, rate) }
                    TrendPoint(label = p.bucketLabel(bucketAnchor), totalUsd = total)
                }
                _trend.value = points
            }
        }
    }

    fun setPeriod(newPeriod: Period) {
        period.value = newPeriod
    }

    fun goToPrevious() {
        anchorDate.value = period.value.shift(anchorDate.value, -1)
    }

    fun goToNext() {
        anchorDate.value = period.value.shift(anchorDate.value, 1)
    }
}
