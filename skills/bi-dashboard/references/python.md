### 9.4 Python — Plotly (also Streamlit and Dash) and matplotlib

Story layer and formatting (pt-BR, without depending on the system locale):

```python
import pandas as pd

MONTHS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"]
ROLES = {  # fill in from the project design system
    "ink": "#1A1A1A", "muted": "#6B6B6B", "context": "#C4C4C4",
    "highlight": "#E8590C", "highlight_text": "#C2410C", "surface": "#FFFFFF",
}

def num_br(v: float, digits: int = 1) -> str:
    return f"{v:,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")

def money(v: float, digits: int = 1) -> str:
    if abs(v) >= 1e6:
        return f"R$ {num_br(v / 1e6, digits)} mi"
    if abs(v) >= 1e3:
        return f"R$ {num_br(v / 1e3, digits)} mil"
    return f"R$ {num_br(v, 0)}"

def times(f: float) -> str:
    return f"{round(f)} times" if abs(f - round(f)) < 0.15 else f"{num_br(f, 1)} times"

def short_day(d: pd.Timestamp) -> str:
    return f"{d.day} {MONTHS[d.month - 1].lower()}"

def peak_story(df: pd.DataFrame, event: str | None = None) -> dict:
    """df: columns 'date' (datetime) and 'value'; complete series, no gaps."""
    baseline = df["value"].median()
    peak = df.loc[df["value"].idxmax()]
    factor = peak["value"] / baseline
    title = (f"{event or 'The peak'} sold {times(factor)} more than a normal day"
             if factor >= 1.5 else "Daily sales stayed flat over the period")
    return {"baseline": baseline, "peak": peak, "factor": factor, "title": title,
            "colors": [ROLES["highlight"] if d == peak["date"] else ROLES["context"] for d in df["date"]]}
```

Plotly:

```python
import plotly.graph_objects as go

def peak_bars_plotly(df: pd.DataFrame, s: dict, subtitle: str, source: str) -> go.Figure:
    months = pd.date_range(df["date"].min().replace(day=1), df["date"].max(), freq="MS")
    p = s["peak"]
    fig = go.Figure(go.Bar(x=df["date"], y=df["value"], marker_color=s["colors"], marker_line_width=0,
                           hovertemplate="%{x|%d/%m/%Y}<br>R$ %{y:,.0f}<extra></extra>"))
    fig.update_layout(
        title=dict(x=0, xref="paper", xanchor="left", text=f"<b>{s['title']}</b><br><span style='font-size:13px;color:{ROLES['muted']}'>{subtitle}</span>"),
        font=dict(family="Inter, system-ui, sans-serif", color=ROLES["ink"], size=12),
        plot_bgcolor=ROLES["surface"], paper_bgcolor=ROLES["surface"], separators=",.",
        bargap=0.35, showlegend=False, margin=dict(l=24, r=24, t=96, b=56))
    fig.update_yaxes(visible=False)
    fig.update_xaxes(showgrid=False, showline=False, ticks="", tickvals=months,
                     ticktext=[MONTHS[m.month - 1] for m in months], tickfont=dict(color=ROLES["muted"], size=11))
    fig.add_hline(y=s["baseline"], line_dash="dot", line_width=1, line_color=ROLES["muted"],
                  annotation_text=f"normal day (median) · {money(s['baseline'])}", annotation_position="top left",
                  annotation_font=dict(size=11, color=ROLES["muted"]))
    fig.add_annotation(x=p["date"], y=p["value"], showarrow=False, xanchor="right", yanchor="top", xshift=-6, align="right",
                       text=f"<b><span style='font-size:22px'>{money(p['value']).upper()}</span></b><br>"
                            f"{short_day(p['date'])} · {times(s['factor'])} a normal day",
                       font=dict(color=ROLES["highlight_text"], size=12))
    fig.add_annotation(x=0, y=-0.16, xref="paper", yref="paper", showarrow=False, xanchor="left",
                       text=source, font=dict(size=10, color=ROLES["muted"]))
    return fig
```

In Streamlit: `st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})`. In Dash: `dcc.Graph(figure=fig, config={"displayModeBar": False})`. For a dark theme, swap `ROLES` for the project's dark tokens.

matplotlib (static reports, PDFs, emails):

```python
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.ticker import FuncFormatter

def peak_bars_mpl(df: pd.DataFrame, s: dict, subtitle: str, source: str):
    p = s["peak"]
    fig, ax = plt.subplots(figsize=(10, 4.6), dpi=200)
    fig.patch.set_facecolor(ROLES["surface"]); ax.set_facecolor(ROLES["surface"])
    ax.bar(df["date"], df["value"], width=0.7, color=s["colors"], linewidth=0)
    ax.axhline(s["baseline"], ls=(0, (2, 3)), lw=1, color=ROLES["muted"])
    ax.text(df["date"].iloc[0], s["baseline"], f"normal day (median) · {money(s['baseline'])}", va="bottom",
            fontsize=9, color=ROLES["muted"], bbox=dict(facecolor=ROLES["surface"], edgecolor="none", pad=1.5))
    ax.annotate(f"{money(p['value']).upper()}\n{short_day(p['date'])} · {times(s['factor'])} a normal day",
                xy=(p["date"], p["value"]), xytext=(-8, 0), textcoords="offset points",
                ha="right", va="top", color=ROLES["highlight_text"], fontsize=13, fontweight="bold")
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.yaxis.set_visible(False)
    ax.tick_params(axis="x", length=0, colors=ROLES["muted"], labelsize=9)
    ax.set_xlim(df["date"].min() - pd.Timedelta(days=2), df["date"].max() + pd.Timedelta(days=2))
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(FuncFormatter(lambda x, _: MONTHS[mdates.num2date(x).month - 1]))
    fig.text(0.02, 0.97, s["title"], fontsize=17, fontweight="bold", color=ROLES["ink"], va="top")
    fig.text(0.02, 0.89, subtitle, fontsize=10, color=ROLES["muted"], va="top")
    fig.text(0.02, 0.01, source, fontsize=8, color=ROLES["muted"])
    fig.subplots_adjust(top=0.80, left=0.03, right=0.98, bottom=0.10)
    return fig
```
