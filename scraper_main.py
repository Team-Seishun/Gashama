from playwright.sync_api import sync_playwright
import time
import re
import csv

def main():
    target_url = "https://gashapon.jp/schedule/" 
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # ==========================================
        # 1. 一覧ページからJANコードを収集する
        # ==========================================
        print(f"【Step 1】一覧ページからJANコードを探します...\nURL: {target_url}")
        page.goto(target_url, wait_until="networkidle")
        time.sleep(3)
        
        jan_codes = []
        links = page.locator("a").all()
        for link in links:
            href = link.get_attribute("href")
            if href and "jan_code=" in href:
                match = re.search(r'jan_code=(\d+)', href)
                if match:
                    jan_codes.append(match.group(1))
                    
        unique_jan_codes = list(set(jan_codes))
        print(f"重複しないJANコードを {len(unique_jan_codes)} 件見つけました！\n")
        
        # ==========================================
        # 2. CSVファイルの準備
        # ==========================================
        csv_filename = "mejirushi_accessory_data.csv"
        
        with open(csv_filename, mode="w", newline="", encoding="utf-8-sig") as file:
            writer = csv.writer(file)
            writer.writerow(["JANコード", "ガチャポン名", "ラインナップ"])
            
            # ==========================================
            # 3. 「めじるしアクセサリー」が含まれるものだけ抽出して保存
            # ==========================================
            print("【Step 2】「めじるしアクセサリー」が含まれる詳細データを取得・保存します...\n")
            
            matched_count = 0
            
            for code in unique_jan_codes:
                detail_url = f"https://gashapon.jp/products/detail.php?jan_code={code}"
                
                try:
                    page.goto(detail_url, wait_until="networkidle")
                    time.sleep(1.5)
                    
                    # ガチャ名を取得
                    name = page.locator("h1.pg-heading").inner_text()
                    
                    # 🌟 タイトルに「めじるしアクセサリー」が含まれているかチェック
                    if "めじるしアクセサリー" in name:
                        matched_count += 1
                        
                        # ラインナップを取得
                        item_elements = page.locator(".pg-detailItems__name").all()
                        item_names = [item.inner_text() for item in item_elements]
                        items_joined = " / ".join(item_names)
                        
                        print(f"✨ [{matched_count}] 発見: {name}")
                        writer.writerow([code, name, items_joined])
                    else:
                        print(f"スキップ: {name}")
                        
                except Exception as e:
                    print(f"エラー [{code}]: {e}")
                    
                time.sleep(0.5)
                
        print("\n========================================")
        print(f"完了！「めじるしアクセサリー」を {matched_count} 件取得し『 {csv_filename} 』に保存しました！")
        print("========================================")
        browser.close()

if __name__ == "__main__":
    main()