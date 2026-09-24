package com.mahdi.walletly.ui.categories

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mahdi.walletly.data.Category
import com.mahdi.walletly.data.WalletRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class CategoriesViewModel(private val repository: WalletRepository) : ViewModel() {

    val categories: StateFlow<List<Category>> = repository.categories
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun addCategory(name: String, colorHex: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            repository.addCategory(Category(name = name.trim(), colorHex = colorHex))
        }
    }

    fun updateCategory(category: Category, name: String, colorHex: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            repository.updateCategory(category.copy(name = name.trim(), colorHex = colorHex))
        }
    }

    fun deleteCategory(category: Category) {
        viewModelScope.launch { repository.deleteCategory(category) }
    }
}
