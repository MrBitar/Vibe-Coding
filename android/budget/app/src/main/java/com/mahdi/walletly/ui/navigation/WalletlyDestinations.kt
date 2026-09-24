package com.mahdi.walletly.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.ui.graphics.vector.ImageVector

sealed class WalletlyDestination(val route: String, val label: String, val icon: ImageVector) {
    data object Home : WalletlyDestination("home", "Home", Icons.Filled.Home)
    data object Stats : WalletlyDestination("stats", "Stats", Icons.Filled.ShowChart)
    data object Categories : WalletlyDestination("categories", "Categories", Icons.Filled.Category)
    data object Settings : WalletlyDestination("settings", "Settings", Icons.Filled.Settings)
}

val bottomNavDestinations = listOf(
    WalletlyDestination.Home,
    WalletlyDestination.Stats,
    WalletlyDestination.Categories,
    WalletlyDestination.Settings
)

const val ADD_EXPENSE_ROUTE = "add_expense"
const val EXPENSE_ID_ARG = "expenseId"
