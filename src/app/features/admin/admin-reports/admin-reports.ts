import { CurrencyPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { CategorySales, ReportProduct, ReportsData, ReportService } from '../../../core/services/report.service';
import { OrderStatus } from '../../../core/models';

const STATUS_ORDER: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-[#E3F3E7] text-[#2F7A4F]',
  cancelled: 'bg-red-100 text-red-800',
};

const BRAND = '#B5583A';
// Fixed-order categorical hues (validated: worst adjacent CVD ΔE 24.2 against a
// white surface) — top 5 categories, one hue each, never a generated 6th.
const CATEGORY_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7'];

@Component({
  selector: 'app-admin-reports',
  imports: [CurrencyPipe],
  template: `
    <div class="space-y-6">
      <div class="inline-flex rounded-full border border-line p-1">
        @for (v of views; track v.id) {
          <button
            type="button"
            (click)="setView(v.id)"
            class="px-4 py-1.5 rounded-full text-sm font-medium transition"
            [class]="view() === v.id ? 'bg-brand-600 text-white' : 'text-sub'"
          >
            {{ v.label }}
          </button>
        }
      </div>

      <div [class.hidden]="view() !== 'overview'" class="space-y-6">
        @if (data(); as d) {
          <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div class="bg-white border border-line rounded-2xl p-4">
              <p class="text-xs font-bold text-sub uppercase tracking-wide">Today</p>
              <p class="font-serif text-xl font-extrabold text-ink mt-1">{{ d.revenue.today | currency:'BDT':'symbol':'1.0-0' }}</p>
            </div>
            <div class="bg-white border border-line rounded-2xl p-4">
              <p class="text-xs font-bold text-sub uppercase tracking-wide">This week</p>
              <p class="font-serif text-xl font-extrabold text-ink mt-1">{{ d.revenue.week | currency:'BDT':'symbol':'1.0-0' }}</p>
            </div>
            <div class="bg-white border border-line rounded-2xl p-4">
              <p class="text-xs font-bold text-sub uppercase tracking-wide">This month</p>
              <p class="font-serif text-xl font-extrabold text-ink mt-1">{{ d.revenue.month | currency:'BDT':'symbol':'1.0-0' }}</p>
            </div>
            <div class="bg-white border border-line rounded-2xl p-4">
              <p class="text-xs font-bold text-sub uppercase tracking-wide">All time</p>
              <p class="font-serif text-xl font-extrabold text-brand-600 mt-1">{{ d.revenue.all_time | currency:'BDT':'symbol':'1.0-0' }}</p>
            </div>
            <div class="bg-white border border-line rounded-2xl p-4">
              <p class="text-xs font-bold text-sub uppercase tracking-wide">Avg order value</p>
              <p class="font-serif text-xl font-extrabold text-ink mt-1">{{ d.avg_order_value | currency:'BDT':'symbol':'1.0-0' }}</p>
            </div>
            <div class="bg-white border border-line rounded-2xl p-4">
              <p class="text-xs font-bold text-sub uppercase tracking-wide">Total orders</p>
              <p class="font-serif text-xl font-extrabold text-ink mt-1">{{ d.total_orders }}</p>
            </div>
          </div>

          <div class="bg-white border border-line rounded-2xl p-5">
            <h2 class="text-sm font-bold text-ink mb-3">Orders by status</h2>
            <div class="flex flex-wrap gap-2">
              @for (status of statusOrder; track status) {
                <span class="text-sm font-semibold rounded-full px-3.5 py-1.5" [class]="statusClasses[status]">
                  {{ d.order_counts[status] }} {{ statusLabel[status] }}
                </span>
              }
            </div>
          </div>
        }

        <div class="flex items-center gap-2">
          @for (r of ranges; track r) {
            <button
              type="button"
              (click)="setRange(r)"
              class="px-3.5 py-1.5 rounded-full text-sm font-medium transition"
              [class]="range() === r ? 'bg-brand-600 text-white' : 'border border-line text-sub hover:bg-cream'"
            >
              Last {{ r }} days
            </button>
          }
        </div>

        <div class="bg-white border border-line rounded-2xl p-5">
          <h2 class="font-serif font-semibold text-lg text-ink mb-4">Revenue trend</h2>
          <div #trendChart class="w-full h-64"></div>
        </div>

        <div class="bg-white border border-line rounded-2xl p-5">
          <h2 class="font-serif font-semibold text-lg text-ink mb-4">Top products <span class="text-sm font-sans font-normal text-sub">(last {{ range() }} days)</span></h2>
          <div #topProductsChart class="w-full h-72"></div>
        </div>
      </div>

      <div [class.hidden]="view() !== 'categories'" class="space-y-6">
        <div class="flex items-center gap-2">
          @for (r of ranges; track r) {
            <button
              type="button"
              (click)="setRange(r)"
              class="px-3.5 py-1.5 rounded-full text-sm font-medium transition"
              [class]="range() === r ? 'bg-brand-600 text-white' : 'border border-line text-sub hover:bg-cream'"
            >
              Last {{ r }} days
            </button>
          }
        </div>

        <div class="bg-white border border-line rounded-2xl p-5">
          <div class="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 class="font-serif font-semibold text-lg text-ink">Which category sold the most</h2>
              <p class="text-sm text-sub mt-1">
                {{ manualCategoryIds().length > 0 ? 'Chosen categories' : 'Top categories' }} by share of total revenue, last {{ range() }} days — click a slice or legend item to filter the table below.
              </p>
            </div>
            <div class="w-72 shrink-0 rounded-xl border border-line p-3">
              <p class="text-xs text-sub mb-2">Pick up to 5 categories to compare.</p>

              @if (manualCategoryIds().length < 5) {
                <div class="relative">
                  <input
                    type="text"
                    [value]="categorySearch()"
                    (input)="onCategorySearchInput($any($event.target).value)"
                    (focus)="dropdownOpen.set(true)"
                    (blur)="dropdownOpen.set(false)"
                    placeholder="Search categories..."
                    class="w-full text-sm rounded-lg border border-line px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  @if (dropdownOpen()) {
                    <ul
                      (mousedown)="$event.preventDefault()"
                      class="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-line bg-white shadow-lg"
                    >
                      @for (c of availableCategoryOptions(); track c.id) {
                        <li>
                          <button type="button" (click)="pickCategory(c.id)" class="w-full text-left px-3 py-2 text-sm hover:bg-brand-50">
                            {{ c.name }}
                          </button>
                        </li>
                      } @empty {
                        <li class="px-3 py-2 text-sm text-sub">No match.</li>
                      }
                    </ul>
                  }
                </div>
              } @else {
                <p class="text-xs text-brand-600 font-medium">5 selected — remove one to pick another.</p>
              }

              <div class="mt-3 space-y-1.5">
                @for (id of manualCategoryIds(); track id; let i = $index) {
                  <div class="flex items-center justify-between gap-2 text-sm bg-cream rounded-lg px-2.5 py-1.5">
                    <span class="text-ink"><span class="text-sub font-semibold mr-1">{{ i + 1 }}.</span>{{ categoryName(id) }}</span>
                    <button type="button" (click)="removeManualCategory(id)" aria-label="Remove" class="text-sub hover:text-red-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                }
              </div>

              @if (manualCategoryIds().length > 0) {
                <button type="button" (click)="resetManualCategories()" class="mt-2 text-xs font-semibold text-brand-600 hover:underline">
                  Reset to auto top 5
                </button>
              }
            </div>
          </div>
          @if (!categoriesLoading() && categoryData().length === 0) {
            <p class="text-sub text-sm mt-4">No sales in this range yet.</p>
          }
          <div #categoryChart class="w-full h-80"></div>
        </div>

        <div class="bg-white border border-line rounded-2xl p-5">
          <div class="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 class="font-serif font-semibold text-lg text-ink">
              Products
              @if (selectedCategoryName(); as name) {
                <span class="text-sm font-sans font-normal text-sub">— {{ name }}</span>
              }
            </h2>
            @if (selectedCategoryId() !== null) {
              <button type="button" (click)="clearCategoryFilter()" class="text-sm font-semibold text-brand-600 hover:underline">
                Show all categories
              </button>
            }
          </div>

          @if (productsLoading()) {
            <p class="text-sub text-sm">Loading...</p>
          } @else if (filteredProducts().length === 0) {
            <p class="text-sub text-sm">No sales in this range yet.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-sub border-b border-line">
                  <tr>
                    <th class="py-2 pr-4 font-medium">Name</th>
                    <th class="py-2 pr-4 font-medium">Category</th>
                    <th class="py-2 pr-4 font-medium">Price per piece</th>
                    <th class="py-2 pr-4 font-medium">Quantity</th>
                    <th class="py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (product of filteredProducts(); track product.id ?? product.name) {
                    <tr>
                      <td class="py-2 pr-4 text-ink font-medium">{{ product.name || 'Product removed' }}</td>
                      <td class="py-2 pr-4 text-sub">{{ product.category }}</td>
                      <td class="py-2 pr-4 text-ink">{{ product.unit_price | currency:'BDT':'symbol':'1.0-0' }}</td>
                      <td class="py-2 pr-4 text-ink">{{ product.units_sold }}</td>
                      <td class="py-2 font-semibold text-ink">{{ product.total | currency:'BDT':'symbol':'1.0-0' }}</td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-line font-bold">
                    <td class="py-2.5 pr-4 text-ink" colspan="3">Total</td>
                    <td class="py-2.5 pr-4 text-ink">{{ filteredTotalUnits() }} pc</td>
                    <td class="py-2.5 text-brand-600 font-serif">{{ filteredTotalRevenue() | currency:'BDT':'symbol':'1.0-0' }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AdminReports implements AfterViewInit, OnDestroy {
  private reportService = inject(ReportService);

  loading = signal(true);
  data = signal<ReportsData | null>(null);
  range = signal<7 | 30 | 90>(30);

  ranges: (7 | 30 | 90)[] = [7, 30, 90];
  statusOrder = STATUS_ORDER;
  statusLabel = STATUS_LABEL;
  statusClasses = STATUS_CLASSES;

  view = signal<'overview' | 'categories'>('overview');
  views: { id: 'overview' | 'categories'; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'categories', label: 'Categories' },
  ];

  categoriesLoading = signal(true);
  categoryData = signal<CategorySales[]>([]);
  productsLoading = signal(true);
  allProducts = signal<ReportProduct[]>([]);
  selectedCategoryId = signal<number | null>(null);

  manualCategoryIds = signal<number[]>([]);
  categorySearch = signal('');
  dropdownOpen = signal(false);

  availableCategoryOptions = computed(() => {
    const term = this.categorySearch().trim().toLowerCase();
    const selected = new Set(this.manualCategoryIds());
    return this.categoryData()
      .filter((c) => !selected.has(c.id))
      .filter((c) => !term || c.name.toLowerCase().includes(term));
  });

  // Manual pick wins if the admin chose any; otherwise auto top 5 by revenue
  // (categoryData is already sorted desc by the backend).
  displayedCategories = computed(() => {
    const manual = this.manualCategoryIds();
    if (manual.length > 0) {
      return this.categoryData().filter((c) => manual.includes(c.id));
    }
    return this.categoryData().slice(0, 5);
  });

  filteredProducts = computed(() => {
    const id = this.selectedCategoryId();
    const products = this.allProducts();
    if (id !== null) return products.filter((p) => p.category_id === id);
    const shownIds = new Set(this.displayedCategories().map((c) => c.id));
    return products.filter((p) => shownIds.has(p.category_id));
  });

  filteredTotalUnits = computed(() => this.filteredProducts().reduce((sum, p) => sum + p.units_sold, 0));
  filteredTotalRevenue = computed(() => this.filteredProducts().reduce((sum, p) => sum + p.total, 0));

  selectedCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (id === null) return null;
    return this.categoryData().find((c) => c.id === id)?.name ?? this.allProducts().find((p) => p.category_id === id)?.category ?? null;
  });

  private trendChartRef = viewChild<ElementRef<HTMLDivElement>>('trendChart');
  private topProductsChartRef = viewChild<ElementRef<HTMLDivElement>>('topProductsChart');
  private categoryChartRef = viewChild<ElementRef<HTMLDivElement>>('categoryChart');

  private trendRoot?: am5.Root;
  private trendSeries?: am5xy.LineSeries;
  private topProductsRoot?: am5.Root;
  private topProductsSeries?: am5xy.ColumnSeries;
  private categoryRoot?: am5.Root;
  private categorySeries?: am5percent.PieSeries;

  constructor() {
    this.load();

    effect(() => {
      const d = this.data();
      if (d) {
        this.updateTrendChart(d);
        this.updateTopProductsChart(d);
      }
    });

    effect(() => {
      const categories = this.displayedCategories();
      this.updateCategoryChart(categories);
    });
  }

  ngAfterViewInit() {
    this.initTrendChart();
    this.initTopProductsChart();
    this.initCategoryChart();
  }

  ngOnDestroy() {
    this.trendRoot?.dispose();
    this.topProductsRoot?.dispose();
    this.categoryRoot?.dispose();
  }

  setView(v: 'overview' | 'categories') {
    this.view.set(v);
    if (v === 'categories' && this.categoryData().length === 0) {
      this.loadCategories();
      this.loadProducts();
    }
  }

  setRange(r: 7 | 30 | 90) {
    this.range.set(r);
    if (this.view() === 'categories') {
      this.loadCategories();
      this.loadProducts();
    } else {
      this.load();
    }
  }

  onCategorySearchInput(value: string) {
    this.categorySearch.set(value);
    this.dropdownOpen.set(true);
  }

  pickCategory(id: number) {
    this.manualCategoryIds.update((ids) => (ids.length < 5 && !ids.includes(id) ? [...ids, id] : ids));
    this.categorySearch.set('');
    if (this.manualCategoryIds().length >= 5) {
      this.dropdownOpen.set(false);
    }
  }

  removeManualCategory(id: number) {
    this.manualCategoryIds.update((ids) => ids.filter((x) => x !== id));
  }

  categoryName(id: number): string {
    return this.categoryData().find((c) => c.id === id)?.name ?? '';
  }

  resetManualCategories() {
    this.manualCategoryIds.set([]);
    this.dropdownOpen.set(false);
  }

  selectCategoryFilter(id: number) {
    this.selectedCategoryId.set(this.selectedCategoryId() === id ? null : id);
  }

  clearCategoryFilter() {
    this.selectedCategoryId.set(null);
  }

  private load() {
    this.loading.set(true);
    this.reportService.index(this.range()).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadCategories() {
    this.categoriesLoading.set(true);
    this.reportService.categories(this.range()).subscribe({
      next: (res) => {
        this.categoryData.set(res.categories);
        this.categoriesLoading.set(false);
      },
      error: () => this.categoriesLoading.set(false),
    });
  }

  private loadProducts() {
    this.productsLoading.set(true);
    this.reportService.products(this.range()).subscribe({
      next: (res) => {
        this.allProducts.set(res.products);
        this.productsLoading.set(false);
      },
      error: () => this.productsLoading.set(false),
    });
  }

  // ── Revenue trend: line + area, single brand hue ──────────────────────
  private initTrendChart() {
    const el = this.trendChartRef()?.nativeElement;
    if (!el) return;

    const root = am5.Root.new(el);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout })
    );

    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        baseInterval: { timeUnit: 'day', count: 1 },
        renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 50 }),
      })
    );
    const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererY.new(root, {}) }));

    const series = chart.series.push(
      am5xy.LineSeries.new(root, {
        xAxis,
        yAxis,
        valueYField: 'revenue',
        valueXField: 'date',
        stroke: am5.color(BRAND),
        fill: am5.color(BRAND),
        tooltip: am5.Tooltip.new(root, { labelText: '{valueY.formatNumber("#,###")} BDT\n{orders} orders' }),
      })
    );
    series.strokes.template.setAll({ strokeWidth: 2 });
    series.fills.template.setAll({ visible: true, fillOpacity: 0.1 });
    series.bullets.push(() =>
      am5.Bullet.new(root, { sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(BRAND), stroke: am5.color('#ffffff'), strokeWidth: 2 }) })
    );

    const cursor = chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none', xAxis }));
    cursor.lineY.set('visible', false);

    this.trendRoot = root;
    this.trendSeries = series;

    const d = this.data();
    if (d) this.updateTrendChart(d);
  }

  private updateTrendChart(d: ReportsData) {
    this.trendSeries?.data.setAll(d.sales_over_time.map((p) => ({ date: new Date(p.date + 'T00:00:00').getTime(), revenue: p.revenue, orders: p.orders })));
  }

  // ── Top products: horizontal bar, single brand hue, value at tip ──────
  private initTopProductsChart() {
    const el = this.topProductsChartRef()?.nativeElement;
    if (!el) return;

    const root = am5.Root.new(el);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none' }));

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, { categoryField: 'name', renderer: am5xy.AxisRendererY.new(root, { inversed: true, minGridDistance: 20 }) })
    );
    const xAxis = chart.xAxes.push(am5xy.ValueAxis.new(root, { renderer: am5xy.AxisRendererX.new(root, {}), min: 0 }));

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis,
        yAxis,
        valueXField: 'revenue',
        categoryYField: 'name',
        tooltip: am5.Tooltip.new(root, { labelText: '{units_sold} sold · {valueX.formatNumber("#,###")} BDT' }),
      })
    );
    series.columns.template.setAll({ fill: am5.color(BRAND), stroke: am5.color(BRAND), height: am5.percent(60), cornerRadiusTR: 4, cornerRadiusBR: 4 });
    series.bullets.push(() =>
      am5.Bullet.new(root, {
        locationX: 1,
        sprite: am5.Label.new(root, { text: '{valueX.formatNumber("#,###")} BDT', centerY: am5.p50, centerX: am5.p0, dx: 8, populateText: true }),
      })
    );

    this.topProductsRoot = root;
    this.topProductsSeries = series;

    const d = this.data();
    if (d) this.updateTopProductsChart(d);
  }

  private updateTopProductsChart(d: ReportsData) {
    if (!this.topProductsSeries) return;
    const items = [...d.top_products].reverse().map((p) => ({
      name: p.name || 'Product removed',
      revenue: p.revenue,
      units_sold: p.units_sold,
    }));
    const yAxis = this.topProductsSeries.get('yAxis') as am5xy.CategoryAxis<am5xy.AxisRendererY>;
    yAxis.data.setAll(items);
    this.topProductsSeries.data.setAll(items);
  }

  // ── Category ranking: donut, top 5 by share of total revenue ──────────
  // Slice size follows revenue; the label/tooltip percent is against the
  // grand total across every category (server-computed), not just these 5.
  private initCategoryChart() {
    const el = this.categoryChartRef()?.nativeElement;
    if (!el) return;

    const root = am5.Root.new(el);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(am5percent.PieChart.new(root, { innerRadius: am5.percent(55) }));

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: 'revenue',
        categoryField: 'name',
        tooltip: am5.Tooltip.new(root, { labelText: '{category}: {percent}% of total · {units_sold} sold' }),
      })
    );
    series.slices.template.setAll({ templateField: 'sliceSettings', strokeWidth: 2, stroke: am5.color('#ffffff'), cursorOverStyle: 'pointer' });
    series.labels.template.set('text', '{category}\n{percent}%');
    series.slices.template.events.on('click', (ev) => {
      const ctx = ev.target.dataItem?.dataContext as { id?: number } | undefined;
      if (ctx?.id !== undefined) this.selectCategoryFilter(ctx.id);
    });

    const legend = chart.children.push(
      am5.Legend.new(root, { centerY: am5.percent(50), y: am5.percent(50), layout: root.verticalLayout, marginLeft: 20 })
    );
    legend.itemContainers.template.set('toggleKey', undefined);
    legend.itemContainers.template.events.on('click', (ev) => {
      const ctx = ev.target.dataItem?.dataContext as { id?: number } | undefined;
      if (ctx?.id !== undefined) this.selectCategoryFilter(ctx.id);
    });
    legend.data.setAll(series.dataItems);
    series.events.on('datavalidated', () => legend.data.setAll(series.dataItems));

    this.categoryRoot = root;
    this.categorySeries = series;
    this.updateCategoryChart(this.displayedCategories());
  }

  private updateCategoryChart(categories: CategorySales[]) {
    if (!this.categorySeries) return;
    const items = categories.map((c, i) => ({
      id: c.id,
      name: c.name,
      revenue: c.revenue,
      units_sold: c.units_sold,
      percent: c.percent,
      sliceSettings: { fill: am5.color(CATEGORY_COLORS[i % CATEGORY_COLORS.length]) },
    }));
    this.categorySeries.data.setAll(items);
  }
}
