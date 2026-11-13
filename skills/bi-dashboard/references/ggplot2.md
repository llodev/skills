### 9.5 R — ggplot2

```r
library(ggplot2)
library(dplyr)

roles  <- c(ink = "#1A1A1A", muted = "#6B6B6B", context = "#C4C4C4", highlight = "#E8590C", highlight_text = "#C2410C")
months <- c("JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ")
money  <- function(v) paste0("R$ ", format(round(v / 1e3, 1), big.mark = ".", decimal.mark = ",", nsmall = 1), " mil")

baseline <- median(df$value)
peak     <- slice_max(df, value, n = 1, with_ties = FALSE)
factor   <- peak$value / baseline

ggplot(df, aes(date, value)) +
  geom_col(aes(fill = date == peak$date), width = 0.7) +
  scale_fill_manual(values = c(`FALSE` = roles[["context"]], `TRUE` = roles[["highlight"]]), guide = "none") +
  geom_hline(yintercept = baseline, linetype = "dashed", linewidth = 0.3, colour = roles[["muted"]]) +
  annotate("label", x = min(df$date), y = baseline, label = paste("normal day (median) ·", money(baseline)),
           hjust = 0, vjust = -0.3, size = 3, colour = roles[["muted"]], label.size = 0, fill = "white") +
  annotate("text", x = peak$date - 3, y = peak$value, hjust = 1, vjust = 1, lineheight = 0.95,
           label = paste0(toupper(money(peak$value)), "\n", round(factor), " times a normal day"),
           colour = roles[["highlight_text"]], fontface = "bold", size = 4.5) +
  scale_x_date(date_breaks = "1 month", labels = function(d) months[as.integer(format(d, "%m"))],
               expand = expansion(mult = 0.01)) +
  labs(title = "Black Friday sold 5 times more than a normal day",
       subtitle = "Daily sales in 2025 · each bar is one day", caption = "SOURCE: SALES.CSV", x = NULL, y = NULL) +
  theme_minimal(base_size = 11) +
  theme(panel.grid = element_blank(), axis.text.y = element_blank(),
        axis.text.x = element_text(colour = roles[["muted"]]),
        plot.title.position = "plot", plot.caption.position = "plot",
        plot.title = element_text(face = "bold", size = 18, colour = roles[["ink"]]),
        plot.subtitle = element_text(colour = roles[["muted"]]),
        plot.caption = element_text(colour = roles[["muted"]], size = 8, hjust = 0))
```

In production, generate the title with the same logic as `peak_story` (factor ≥ 1.5, honest rounding). In Shiny, wrap it in `renderPlot` and recompute `baseline`/`peak` from the filtered slice.
