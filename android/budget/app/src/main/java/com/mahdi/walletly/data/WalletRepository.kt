package com.mahdi.walletly.data

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import java.time.LocalDate

class WalletRepository(context: Context) {

    private val db = AppDatabase.getInstance(context)
    private val categoryDao = db.categoryDao()
    private val expenseDao = db.expenseDao()
    val preferences = UserPreferences(context)

    val categories: Flow<List<Category>> = categoryDao.getAll()
    val expenses: Flow<List<Expense>> = expenseDao.getAll()

    fun expensesBetween(start: LocalDate, end: LocalDate): Flow<List<Expense>> =
        expenseDao.getBetween(start, end)

    suspend fun ensureDefaultCategoriesSeeded() {
        if (categoryDao.count() == 0) {
            categoryDao.insertAll(DefaultCategories.seed)
        }
    }

    suspend fun addExpense(expense: Expense): Long = expenseDao.insert(expense)

    suspend fun updateExpense(expense: Expense) = expenseDao.update(expense)

    suspend fun deleteExpense(expense: Expense) = expenseDao.delete(expense)

    suspend fun addCategory(category: Category): Long = categoryDao.insert(category)

    suspend fun updateCategory(category: Category) = categoryDao.update(category)

    suspend fun deleteCategory(category: Category) = categoryDao.delete(category)

    suspend fun currentExchangeRate(): Double = preferences.exchangeRate.first()

    /** Converts an amount from [from] currency into [to] currency using the given LBP-per-USD rate. */
    fun convert(amount: Double, from: Currency, to: Currency, lbpPerUsd: Double): Double {
        if (from == to) return amount
        return if (from == Currency.USD && to == Currency.LBP) {
            amount * lbpPerUsd
        } else {
            amount / lbpPerUsd
        }
    }
}
