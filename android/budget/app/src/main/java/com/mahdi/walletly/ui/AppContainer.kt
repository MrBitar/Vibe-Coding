package com.mahdi.walletly.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import com.mahdi.walletly.WalletlyApplication
import com.mahdi.walletly.data.WalletRepository

@Composable
fun rememberWalletRepository(): WalletRepository {
    val app = LocalContext.current.applicationContext as WalletlyApplication
    return app.repository
}
