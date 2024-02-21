import { launch } from 'puppeteer'
import { setTimeout as sleep } from 'node:timers/promises'
import { writeFile } from 'node:fs/promises'

const browser = await launch({ headless: false })
const page = await browser.newPage()

const url = process.argv[2]
const region = process.argv[3]

await page.goto(url)
await page.waitForSelector('[class^=Content_remove]', {
  visible: true,
  timeout: 30_000,
})
await page.click('[class^=Content_remove]')

// Вызов page.click() производит ошибку: Node is either not clickable or not an Element
await page.evaluate(() =>
  document.querySelector('[class^=BurgerButton_burger]').click(),
)

await sleep(1000)
await page.evaluate(() =>
  document
    .querySelector('[class^=FeatureAddressSettingMobile_regionWrapper]')
    .click(),
)

await page.waitForSelector('[class^=UiRegionListBase_list]', { visible: true })
await page.$eval(
  '[class^=UiRegionListBase_list]',
  (list, region) => {
    for (const element of list.querySelectorAll('li')) {
      if (element.textContent === region) {
        element.click()
        return
      }
    }
  },
  region,
)

await page.waitForSelector('[class^=UiRegionListBase_list]', { hidden: true })

await sleep(1000)
await page.screenshot({ path: 'screenshot.jpg', fullPage: true })

const result = await page.evaluate(() => {
  const priceText = document
    .querySelector('[class^=PriceInfo_root]')
    ?.textContent.replace(/,/g, '.')

  let price = 0
  let oldPrice = null

  if (priceText.includes('Скидка')) {
    const [old, actualPrice] = priceText.split('Скидка')

    oldPrice = parseFloat(old)

    // old: " -40% 89,9 ₽/шт"
    price = parseFloat(actualPrice.split('%')[1])
  } else {
    price = parseFloat(priceText)
  }

  return {
    rating: parseFloat(
      document.querySelector('[class^=Rating_value]')?.textContent,
    ),
    reviewsCount: parseInt(
      document.querySelector('[class^=ActionsRow_reviews] button')?.textContent,
    ),
    oldPrice,
    price,
  }
})

await browser.close()

const text = `price=${result.price}
priceOld=${result.oldPrice}
rating=${result.rating}
reviewCount=${result.reviewsCount}`

await writeFile('product.txt', text, 'utf-8')
