// Структурированные данные с метаданными. null = данных нет (НЕ ноль).
window.ENV_DATA = {
  geojsonUrl: "https://raw.githubusercontent.com/akilbekov/almaty.geo.json/master/almaty-districts.geo.json",
  geojsonLocal: "data/districts.geojson",
  districts: {
    "3072001": {key:"turksib",  nameRu:"Турксибский район",  desc:"Северо-восток города. Подтверждённых районных экологических данных в проекте пока нет."},
    "3072807": {key:"almaly",   nameRu:"Алмалинский район",  desc:"Центральная часть города. (Не путать с Алматинской областью.) Районных экологических данных пока нет."},
    "5460063": {key:"nauryzbay",nameRu:"Наурызбайский район",desc:"Юго-запад, предгорья. Районных экологических данных пока нет."}
  },
  categories: [
    {id:"green",title:"Озеленение",icon:"🌿",
     what:"Доля растительности и NDVI = (NIR − Red)/(NIR + Red) по Sentinel-2 внутри границ района.",
     status:"no",statusText:"Требуются расчёты по спутниковым данным",
     note:"NDVI нельзя получить из обычного снимка: нужны спектральные каналы, маска облаков и дата съёмки.",
     source:"https://dataspace.copernicus.eu/"},
    {id:"air",title:"Качество воздуха",icon:"💨",
     what:"PM2.5, PM10, NO₂, SO₂, CO по данным постов Казгидромета.",
     status:"city",statusText:"Нет подтверждённых данных по району",
     note:"В Алматы сообщается о 16 стационарных постах наблюдения — это характеристика городской сети, а не наличие поста в каждом районе. Значения измерений в проект пока не загружены.",
     source:"https://www.gov.kz/org/almaty/press/news/details/1114325"},
    {id:"heat",title:"Городской перегрев",icon:"🔥",
     what:"Температура поверхности (LST, °C) по Landsat Collection 2 Level-2 с указанием даты, сезона и разрешения.",
     status:"no",statusText:"Требуются расчёты по спутниковым данным",
     note:"Температура поверхности ≠ температура воздуха. Растр не обработан, карта температур не показывается.",
     source:"https://www.usgs.gov/landsat-missions/landsat-collection-2"},
    {id:"traffic",title:"Транспортная нагрузка",icon:"🚗",
     what:"Интенсивность движения (замеры), плотность дорожной сети км/км² (по OSM).",
     status:"no",statusText:"Нет подтверждённых данных по району",
     note:"OSM даёт геометрию дорог, но не интенсивность движения. Плотность сети не равна трафику.",
     source:"https://data.egov.kz/"},
    {id:"waste",title:"Отходы",icon:"♻️",
     what:"Собрано, переработано, доля переработки.",
     status:"city",statusText:"Только данные по Алматы в целом, 2025 год",
     note:"Значения ниже относятся ко всему городу и не характеризуют отдельные районы.",
     source:"https://gov.kz/org/almaty/press/article/details/228170"}
  ],
  cityWaste2025:{scope:"Алматы, 2025 год",collectedT:595502,recycledT:111308.78,recyclingPct:18.7,coveragePct:100,
    source:"https://gov.kz/org/almaty/press/article/details/228170",
    caveat:"Взято из опубликованного отчёта Управления экологии и окружающей среды Алматы; первоисточник необходимо перепроверить перед защитой."},
  sources:[
    ["Границы районов (GeoJSON, на основе OSM)","https://github.com/akilbekov/almaty.geo.json","Открытые данные OpenStreetMap contributors (ODbL). Проверено: свойства name, nameRu."],
    ["Esri World Imagery","https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9","Архивная спутниковая подложка, не реальное время. Соблюдайте правила использования и атрибуцию."],
    ["Copernicus Data Space (Sentinel-2)","https://dataspace.copernicus.eu/","Источник для будущего расчёта NDVI."],
    ["Казгидромет","https://www.kazhydromet.kz/","Официальные данные о качестве воздуха."],
    ["Управление экологии Алматы — посты наблюдения","https://www.gov.kz/org/almaty/press/news/details/1114325","Сведения о 16 стационарных постах."],
    ["USGS Landsat Collection 2","https://www.usgs.gov/landsat-missions/landsat-collection-2","Температура поверхности (LST)."],
    ["NASA Earthdata","https://earthdata.nasa.gov/","Альтернативные продукты LST."],
    ["Открытые данные РК","https://data.egov.kz/","Поиск транспортных данных."],
    ["Бюро нацстатистики РК: экологические показатели","https://stat.gov.kz/ru/ecologic-indicators/","Статистика по отходам и экологии."],
    ["Отчёт Управления экологии Алматы за 2025 г.","https://gov.kz/org/almaty/press/article/details/228170","Городские данные по ТБО."],
    ["OpenStreetMap","https://www.openstreetmap.org/","Геометрия дорог и уличная подложка."]
  ]
};
