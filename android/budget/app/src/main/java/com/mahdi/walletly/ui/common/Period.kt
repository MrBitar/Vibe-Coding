package com.mahdi.walletly.ui.common

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters

enum class Period(val label: String) {
    DAILY("Day"),
    WEEKLY("Week"),
    MONTHLY("Month")
}

data class DateRange(val start: LocalDate, val end: LocalDate)

fun Period.shift(date: LocalDate, amount: Long): LocalDate = when (this) {
    Period.DAILY -> date.plusDays(amount)
    Period.WEEKLY -> date.plusWeeks(amount)
    Period.MONTHLY -> date.plusMonths(amount)
}

fun Period.rangeFor(anchor: LocalDate): DateRange = when (this) {
    Period.DAILY -> DateRange(anchor, anchor)
    Period.WEEKLY -> DateRange(
        anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
        anchor.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
    )
    Period.MONTHLY -> DateRange(
        anchor.with(TemporalAdjusters.firstDayOfMonth()),
        anchor.with(TemporalAdjusters.lastDayOfMonth())
    )
}
