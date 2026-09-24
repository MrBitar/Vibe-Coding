package com.mahdi.walletly.ui.addexpense

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mahdi.walletly.data.Category
import com.mahdi.walletly.data.Currency
import com.mahdi.walletly.data.Expense
import com.mahdi.walletly.data.WalletRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

data class AddExpenseUiState(
    val amountText: String = "",
    val currency: Currency = Currency.USD,
    val categories: List<Category> = emptyList(),
    val selectedCategoryId: Long? = null,
    val date: LocalDate = LocalDate.now(),
    val note: String = "",
    val isEditing: Boolean = false
)

class AddExpenseViewModel(
    private val repository: WalletRepository,
    private val expenseId: Long
) : ViewModel() {

    private val _uiState = MutableStateFlow(AddExpenseUiState(isEditing = expenseId != -1L))
    val uiState: StateFlow<AddExpenseUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.categories.collect { categories ->
                _uiState.update {
                    it.copy(
                        categories = categories,
                        selectedCategoryId = it.selectedCategoryId ?: categories.firstOrNull()?.id
                    )
                }
            }
        }
        if (expenseId != -1L) {
            viewModelScope.launch {
                val expense = repository.expenses.first().find { it.id == expenseId }
                if (expense != null) {
                    _uiState.update {
                        it.copy(
                            amountText = expense.amount.toString(),
                            currency = expense.currency,
                            selectedCategoryId = expense.categoryId,
                            date = expense.date,
                            note = expense.note
                        )
                    }
                }
            }
        }
    }

    fun updateAmount(text: String) {
        if (text.isEmpty() || text.matches(Regex("^\\d*\\.?\\d*$"))) {
            _uiState.update { it.copy(amountText = text) }
        }
    }

    fun updateCurrency(currency: Currency) = _uiState.update { it.copy(currency = currency) }

    fun updateCategory(id: Long) = _uiState.update { it.copy(selectedCategoryId = id) }

    fun updateDate(date: LocalDate) = _uiState.update { it.copy(date = date) }

    fun updateNote(note: String) = _uiState.update { it.copy(note = note) }

    fun canSave(): Boolean = _uiState.value.amountText.toDoubleOrNull()?.let { it > 0 } == true

    fun save(onDone: () -> Unit) {
        val state = _uiState.value
        val amount = state.amountText.toDoubleOrNull() ?: return
        viewModelScope.launch {
            val expense = Expense(
                id = if (expenseId != -1L) expenseId else 0,
                amount = amount,
                currency = state.currency,
                categoryId = state.selectedCategoryId,
                date = state.date,
                note = state.note
            )
            if (expenseId != -1L) repository.updateExpense(expense) else repository.addExpense(expense)
            onDone()
        }
    }
}
