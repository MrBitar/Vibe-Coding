package com.mahdi.walletly

import android.app.Application
import com.google.android.gms.ads.MobileAds
import com.mahdi.walletly.data.WalletRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class WalletlyApplication : Application() {

    lateinit var repository: WalletRepository
    private val applicationScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        MobileAds.initialize(this)
        repository = WalletRepository(this)
        applicationScope.launch {
            repository.ensureDefaultCategoriesSeeded()
        }
    }
}

