import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';

@Injectable()
// @ts-expect-error: StructuredTool generic depth exceeds TS limit
export class WeatherQueryTool extends StructuredTool {
  readonly name = 'weather_query';
  readonly description =
    '查询实时天气信息。适合用户问"今天天气怎么样"、"现在几度"、"要带伞吗"、"明天会下雨吗"等场景。不传城市则根据用户位置自动定位。';
  readonly category = 'data' as const;
  private readonly logger = new Logger(WeatherQueryTool.name);

  // 由 processWithAgent 在每次调用前注入，优先级高于城市名
  userLocation?: { lat: number; lon: number };

  readonly schema = z.object({
    city: z
      .string()
      .optional()
      .describe('城市名（中文或英文），有用户位置时可不传'),
  });

  protected async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      let lat: number, lon: number, cityName: string;

      if (this.userLocation) {
        // 优先使用前端传来的精确坐标
        lat = this.userLocation.lat;
        lon = this.userLocation.lon;
        // 用 Open-Meteo 反查城市名
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=zh`,
        );
        const geoData = (await geoRes.json()) as { name?: string };
        cityName = geoData.name ?? `(${lat.toFixed(2)}, ${lon.toFixed(2)})`;
      } else if (input.city) {
        // 用城市名查坐标
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.city)}&count=1&language=zh`,
        );
        const geoData = (await geoRes.json()) as {
          results?: { latitude: number; longitude: number; name: string }[];
        };
        if (!geoData.results?.length) {
          return `未找到城市：${input.city}，请换个城市名重试`;
        }
        lat = geoData.results[0].latitude;
        lon = geoData.results[0].longitude;
        cityName = geoData.results[0].name;
      } else {
        // 兜底：用服务器 IP 定位
        const ipRes = await fetch(
          'http://ip-api.com/json?lang=zh-CN&fields=city,lat,lon,status,message',
        );
        const ipData = (await ipRes.json()) as {
          status: string;
          city: string;
          lat: number;
          lon: number;
          message?: string;
        };
        if (ipData.status !== 'success') {
          return `自动定位失败（${ipData.message ?? '未知原因'}），请手动指定城市名`;
        }
        lat = ipData.lat;
        lon = ipData.lon;
        cityName = ipData.city;
      }

      // 查实时天气
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m,relativehumidity_2m` +
          `&timezone=auto`,
      );
      const weatherData = (await weatherRes.json()) as {
        current: {
          temperature_2m: number;
          apparent_temperature: number;
          precipitation: number;
          weathercode: number;
          windspeed_10m: number;
          relativehumidity_2m: number;
        };
      };
      const c = weatherData.current;
      const desc = this.weatherCodeToDesc(c.weathercode);

      return (
        `📍 ${cityName} 当前天气\n` +
        `🌡️ 气温：${c.temperature_2m}°C（体感 ${c.apparent_temperature}°C）\n` +
        `🌤️ 天气：${desc}\n` +
        `💧 湿度：${c.relativehumidity_2m}%\n` +
        `🌬️ 风速：${c.windspeed_10m} km/h\n` +
        `🌧️ 降水量：${c.precipitation} mm`
      );
    } catch (error) {
      this.logger.error('天气查询失败', error);
      return `天气查询失败：${error.message}`;
    }
  }

  private weatherCodeToDesc(code: number): string {
    const map: Record<number, string> = {
      0: '晴天',
      1: '基本晴朗',
      2: '部分多云',
      3: '阴天',
      45: '雾',
      48: '冻雾',
      51: '小毛毛雨',
      53: '中毛毛雨',
      55: '大毛毛雨',
      61: '小雨',
      63: '中雨',
      65: '大雨',
      71: '小雪',
      73: '中雪',
      75: '大雪',
      80: '阵雨',
      81: '中阵雨',
      82: '强阵雨',
      95: '雷雨',
      99: '强雷雨伴冰雹',
    };
    return map[code] ?? `未知(${code})`;
  }
}
