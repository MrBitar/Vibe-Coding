package com.mahdi.walletly.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.mahdi.walletly.ui.addexpense.AddExpenseScreen
import com.mahdi.walletly.ui.categories.CategoriesScreen
import com.mahdi.walletly.ui.home.HomeScreen
import com.mahdi.walletly.ui.settings.SettingsScreen
import com.mahdi.walletly.ui.stats.StatsScreen

@Composable
fun WalletlyNavHost() {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentDestination = navBackStackEntry?.destination

            NavigationBar {
                bottomNavDestinations.forEach { destination ->
                    val selected = currentDestination?.hierarchy?.any { it.route == destination.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(destination.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(destination.icon, contentDescription = destination.label) },
                        label = { androidx.compose.material3.Text(destination.label) }
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = WalletlyDestination.Home.route,
            modifier = androidx.compose.ui.Modifier.padding(innerPadding)
        ) {
            composable(WalletlyDestination.Home.route) {
                HomeScreen(
                    onAddExpense = { navController.navigate("$ADD_EXPENSE_ROUTE?$EXPENSE_ID_ARG=-1") },
                    onEditExpense = { id -> navController.navigate("$ADD_EXPENSE_ROUTE?$EXPENSE_ID_ARG=$id") }
                )
            }
            composable(WalletlyDestination.Stats.route) {
                StatsScreen()
            }
            composable(WalletlyDestination.Categories.route) {
                CategoriesScreen()
            }
            composable(WalletlyDestination.Settings.route) {
                SettingsScreen()
            }
            composable(
                route = "$ADD_EXPENSE_ROUTE?$EXPENSE_ID_ARG={$EXPENSE_ID_ARG}",
                arguments = listOf(
                    navArgument(EXPENSE_ID_ARG) {
                        type = NavType.LongType
                        defaultValue = -1L
                    }
                )
            ) { backStackEntry ->
                val expenseId = backStackEntry.arguments?.getLong(EXPENSE_ID_ARG) ?: -1L
                AddExpenseScreen(
                    expenseId = expenseId,
                    onDone = { navController.popBackStack() }
                )
            }
        }
    }
}
