# 地理数据与地球贴图来源

取得日期：2026-10-20。所有运行资产随项目保存，浏览页面时不依赖外部地图或地理编码服务。

## 地球贴图

| 本地文件 | 分辨率 | 下载来源 |
| --- | --- | --- |
| `earth-day.jpg` | 4096 × 2048 | [three-globe / earth-blue-marble.jpg](https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-blue-marble.jpg) |
| `earth-night.jpg` | 4096 × 2048 | [three-globe / earth-night.jpg](https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-night.jpg) |
| `earth-topology.png` | 2048 × 1024 | [three-globe / earth-topology.png](https://raw.githubusercontent.com/vasturiano/three-globe/master/example/img/earth-topology.png) |

以上文件来自 [three-globe 官方示例资产](https://github.com/vasturiano/three-globe/tree/master/example/img)，上游仓库使用 MIT 许可证，完整许可证随附于 `THREE-GLOBE-LICENSE.txt`。日间与夜间贴图为地球表面合成影像，不是实时卫星图；夜间城市灯光是静态历史合成图。页面仅实时计算太阳方向、昼夜分界与光照范围。

NASA 地球合成影像背景资料：[Blue Marble](https://visibleearth.nasa.gov/images/57723/the-blue-marble)、[Earth at Night](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/)。NASA 影像使用说明：[NASA Images and Media Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)。上游示例没有为每张贴图单独给出传感器、采集年份与处理版本，因此本项目不将贴图标记为特定年度或特定 NASA 产品。

## 国家、地区与河流

- [Natural Earth 1:50m admin 0 countries](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson)，来自 [Natural Earth 官方维护仓库](https://github.com/nvkelso/natural-earth-vector)。下载后对坐标以 0.055° Douglas–Peucker 容差简化，并保留三位小数，生成 `countries.geojson`，共 242 个国家与地区要素。保留最小多边形环，避免小型岛屿国家消失。中文名称来自 `NAME_ZH`，少数名称转换为常用中文简称。定位坐标使用 Natural Earth 的 `LABEL_X` / `LABEL_Y`，属于标签代表点，并非严格行政几何中心。
- [Natural Earth 1:110m rivers and lake centerlines](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_rivers_lake_centerlines.geojson)，生成 `rivers.geojson`，13 个主要河流要素。此比例尺仅展示全球主要河流，线条是简化示意，不适合测量河道。
- Natural Earth 的矢量与栅格地图数据为公共领域：[Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/)。

边界继承 Natural Earth 的小比例尺绘图表达，可能涉及争议地区或实际控制情况。用于地理学习，不作为主权、领土归属、行政区划或精确边界的判断依据。

## 中文搜索地名库

`src/data/places.js` 包含 402 条离线搜索地名：242 个国家/地区要素及 160 个主要城市、山峰、山脉、河流、湖泊、沙漠、海洋和地理区域。国家/地区名称与代表点来自上述 Natural Earth 数据；额外地名使用常见地理代表坐标，中文简介为本项目编写。山脉、河流、海洋等使用一个代表点定位，不表示完整范围或源头。搜索同时支持中文别名、繁体名称（国家/地区）与英文名。

搜索条目类型：`country`、`region`、`city`、`mountain`、`river`、`lake`、`desert`、`ocean`。`zoom` 为建议的相机距地心距离（地球半径为 1）。

## 国家学习资料

`src/data/country-facts.js` 的首都与面积数据派生自 [mledoze/countries](https://github.com/mledoze/countries)，使用上游 `capital` 与 `area`（平方千米）字段。数据取得日期 2026-10-20，主要首都加入常用中文译名；其他保留英文。多首都国家可以包含多个名称。未覆盖的地区保留空值，不猜测首府或面积。面积采用上游统计口径，可能与其他来源的领土/陆地/内水统计口径不同。

这一派生国家资料数据库按 **ODbL-1.0** 许可提供，上游完整许可随附于 `COUNTRIES-LICENSE.txt`。这份数据的许可不替代应用程序源代码各自的许可。人口和大洲字段来自前述公共领域 Natural Earth 数据；人口为约 2019 年的估计值，用于学习比较，不是实时人口数据。

赤道几内亚首都单独按政府 2026-01-02 的正式公告更新为和平城（Ciudad de la Paz），替代上游旧版马拉博记录：[赤道几内亚政府公告](https://www.guineaecuatorialpress.com/noticias/el_presidente_de_la_republica_proclama_la_ciudad_de_la_paz_como_capital_de_la_republica_de_guinea_ecuatorial_con_la_firma_de_un_decreto_ley)。

另外按[斯里兰卡外交部国家概况](https://www.mfa.gov.lk/en/national-profile-and-geography)修正斯里兰卡行政首都为斯里贾亚瓦德纳普拉科特；按[非盟资料](https://au.int/en/cities/lobambaroyal-and-legislative-mbabane-administrative)补全斯威士兰的行政首都姆巴巴纳与王室/立法首都洛班巴。
