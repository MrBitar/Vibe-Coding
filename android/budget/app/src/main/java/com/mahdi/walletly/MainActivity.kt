package com.mahdi.walletly

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.mahdi.walletly.ui.navigation.WalletlyNavHost
import com.mahdi.walletly.ui.theme.WalletlyTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WalletlyTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    WalletlyNavHost()
                }
            }
        }
    }
}
