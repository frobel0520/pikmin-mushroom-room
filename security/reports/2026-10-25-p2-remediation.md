# SEC-P2-20261025：pikmin-mushroom-room

日期：2026-10-25。基準：7c543c4ee7ec28735dc3225a82c08810cee9b3b9（main）。

狀態：隔離修補已備妥，待整合。未推送／合併／部署；原始工作目錄保留。

浮動Supabase @2 CDN改為官方npm 2.118.0本地UMD，官方tarball SHA512核對、MIT授權保留；不再依賴CDN或未證實的SRI攔截結果。

- 1280／375px真實本地SDK載入、17卡片、鍵盤倒數與無溢出
- client I/O fixture下各50暖handler樣本p95<100ms
- REST模擬三次Failed to fetch後停止；正式SDK REST、Supabase RLS未驗證，不冒稱通過

npm公告：不適用／另依原生工具記錄，不視為零漏洞。
Python公告：不適用／未做Python解析。



效能：{"result":"not_applicable","reason":"Only CI source/pins changed or separately recorded runtime fixture metric; no production performance claim"}。

範圍與成本：只跑本機及合成fixture，不啟用付費API或遠端CI。沒有完整正式安全或發布驗收；未評項目not_scored。

- 原始工作目錄、未提交修改與分支全部保留；本報告僅適用此隔離分支。
- 完整history／秘密輪替／正式服務與二進位鑑識不在此輪驗收，未評項目not_scored。

Task契約：輸入為固定基準及既有測試；交付為獨立修補分支、manifest/lockfile或來源修補與此去敏證據；無跨專案依賴。驗收是原生工具成功、已知發現逐項處置、適當真實回歸及影響範圍效能門檻；未完成項目明記，不以fixture代表正式環境。
