/**
 * 为 initvar.yaml 中的所有事务次官生成真实姓名
 * 用法：node scripts/add_names.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../2039/世界书/变量/initvar.yaml');
let content = readFileSync(src, 'utf-8');

const names = {
  外务省: '佐藤浩一',
  防卫省: '中村剛',
  经济产业省: '山本隆司',
  农林水产省: '田辺稔',
  警察厅: '加藤正義',
  内阁府: '大塚和彦',
  宫内厅: '徳永誠一',
  金融厅: '藤原俊介',
  儿童家庭厅: '宮崎美智子',
  公平交易委员会: '杉本義男',
  内阁法制局: '安達繁',
  内阁人事局: '大森健一郎',
  内阁官房: '田中誠',
  人事院: '野村忠',
  会计检查院: '小野寺寛',
  总务省: '小林信夫',
  法务省: '松本雅彦',
  财务省: '渡辺健一',
  文部科学省: '吉田文雄',
  厚生劳动省: '伊藤健司',
  国土交通省: '斉藤博',
  环境省: '森清志',
  消费者厅: '福井恵子',
  复兴厅: '新井実',
  数字化厅: '坂口哲也',
};

for (const [shocho, name] of Object.entries(names)) {
  // 匹配该省厅的事务次官姓名行（在 "事务次官:\n" 之后的第一个 "姓名:" 行）
  // 模式: 省厅名行后紧跟的 事务次官 块中的 姓名 行
  const escapedShocho = shocho.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 匹配该省厅条目下事务次官块中的姓名行
  const re = new RegExp(`(    ${escapedShocho}:\\n[\\s\\S]*?      事务次官:\\n[\\s\\S]*?        姓名: )'[^']*'`, 'g');

  content = content.replace(re, `$1'${name}'`);
}

writeFileSync(src, content, 'utf-8');
console.log('Done. Updated all 事务次官 names in initvar.yaml.');
for (const [shocho, name] of Object.entries(names)) {
  console.log(`  ${shocho}: ${name}`);
}
