package com.mahdi.walletly.data

import androidx.room.TypeConverter
import java.time.LocalDate

class Converters {
    @TypeConverter
    fun fromEpochDay(epochDay: Long?): LocalDate? = epochDay?.let { LocalDate.ofEpochDay(it) }

    @TypeConverter
    fun toEpochDay(date: LocalDate?): Long? = date?.toEpochDay()

    @TypeConverter
    fun fromCurrencyName(name: String?): Currency? = name?.let { Currency.valueOf(it) }

    @TypeConverter
    fun toCurrencyName(currency: Currency?): String? = currency?.name
}
