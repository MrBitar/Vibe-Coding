package com.mahdi.walletly.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class Category(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val colorHex: String,
    val isDefault: Boolean = false
)

object DefaultCategories {
    val seed = listOf(
        Category(name = "Food & Drinks", colorHex = "#FF7043", isDefault = true),
        Category(name = "Transport", colorHex = "#42A5F5", isDefault = true),
        Category(name = "Groceries", colorHex = "#66BB6A", isDefault = true),
        Category(name = "Bills & Utilities", colorHex = "#AB47BC", isDefault = true),
        Category(name = "Rent", colorHex = "#8D6E63", isDefault = true),
        Category(name = "Health", colorHex = "#EC407A", isDefault = true),
        Category(name = "Entertainment", colorHex = "#FFA726", isDefault = true),
        Category(name = "Other", colorHex = "#78909C", isDefault = true)
    )
}
