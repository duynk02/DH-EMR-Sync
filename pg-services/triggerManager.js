const { Pool } = require("pg");

class TriggerManager {
  constructor(dbConfig) {
    this.pool = new Pool(dbConfig);
  }

  // Kiểm tra trigger có tồn tại không
  async triggerExists(triggerName, tableName, schemaName = "current") {
    const query = `
            SELECT 1 
            FROM information_schema.triggers 
            WHERE trigger_name = $1 
            AND event_object_table = $2 
            AND event_object_schema = $3
        `;

    try {
      const result = await this.pool.query(query, [triggerName, tableName, schemaName]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("Lỗi khi kiểm tra trigger:", error);
      return false;
    }
  }

  // Lấy thông tin chi tiết trigger hiện tại
  async getTriggerInfo(triggerName, tableName, schemaName = "current") {
    const query = `
            SELECT 
                trigger_name,
                array_agg(event_manipulation ORDER BY event_manipulation) as events,
                event_object_schema,
                event_object_table,
                action_statement,
                action_timing,
                action_condition
            FROM information_schema.triggers 
            WHERE trigger_name = $1 
            AND event_object_table = $2 
            AND event_object_schema = $3
            GROUP BY trigger_name, event_object_schema, event_object_table, action_statement, action_timing, action_condition
        `;

    try {
      const result = await this.pool.query(query, [triggerName, tableName, schemaName]);
      if (result.rows.length > 0) {
        const row = result.rows[0];
        // Chuyển đổi events thành array nếu chưa phải
        row.events = Array.isArray(row.events) ? row.events : [row.events];
        return row;
      }
      return null;
    } catch (error) {
      console.error("Lỗi khi lấy thông tin trigger:", error);
      return null;
    }
  }

  // So sánh cấu trúc trigger
  compareTriggerStructure(existingTrigger, newTriggerSql) {
    if (!existingTrigger) return false;

    // Parse thông tin từ SQL mới
    const newTriggerInfo = this.parseTriggerSql(newTriggerSql);

    // So sánh timing
    const timingMatch = existingTrigger.action_timing.toUpperCase() === newTriggerInfo.timing.toUpperCase();

    // So sánh events
    const eventsMatch = this.compareEvents(existingTrigger.events, newTriggerInfo.events);

    // So sánh function name (xử lý FUNCTION vs PROCEDURE)
    const existingFunction = this.extractFunctionName(existingTrigger.action_statement);
    const functionMatch = existingFunction === newTriggerInfo.function_name;

    console.log("🔍 So sánh chi tiết:", {
      timing: { existing: existingTrigger.action_timing, new: newTriggerInfo.timing, match: timingMatch },
      events: { existing: existingTrigger.events, new: newTriggerInfo.events, match: eventsMatch },
      function: { existing: existingFunction, new: newTriggerInfo.function_name, match: functionMatch },
    });

    return timingMatch && eventsMatch && functionMatch;
  }

  // Parse SQL để lấy thông tin trigger
  parseTriggerSql(sql) {
    const triggerInfo = {
      name: "",
      timing: "",
      events: [],
      table: "",
      function_name: "",
      columns: [],
    };

    // Lấy tên trigger
    const nameMatch = sql.match(/CREATE TRIGGER\s+(\w+)/i);
    if (nameMatch) triggerInfo.name = nameMatch[1];

    // Lấy timing (BEFORE/AFTER)
    const timingMatch = sql.match(/(BEFORE|AFTER)/i);
    if (timingMatch) triggerInfo.timing = timingMatch[1];

    // Lấy events
    const eventsMatch = sql.match(/(INSERT|UPDATE(?:\s+OF\s+[^)]+)?|DELETE)(?:\s+OR\s+(INSERT|UPDATE(?:\s+OF\s+[^)]+)?|DELETE))*/gi);
    if (eventsMatch) {
      const eventStr = eventsMatch[0];
      // Tách các events bằng OR
      const events = eventStr.split(/\s+OR\s+/i);
      triggerInfo.events = events.map((e) => {
        // Lấy chỉ phần event chính (INSERT, UPDATE, DELETE)
        const match = e.match(/^(INSERT|UPDATE|DELETE)/i);
        return match ? match[1].trim().toUpperCase() : e.trim().toUpperCase();
      });
    }

    // Lấy tên bảng
    const tableMatch = sql.match(/ON\s+(\w+\.\w+|\w+)/i);
    if (tableMatch) triggerInfo.table = tableMatch[1];

    // Lấy tên function (có thể là EXECUTE FUNCTION hoặc EXECUTE PROCEDURE)
    const functionMatch = sql.match(/EXECUTE\s+(FUNCTION|PROCEDURE)\s+([^(]+)/i);
    if (functionMatch) triggerInfo.function_name = functionMatch[2].trim();

    // Lấy columns trong UPDATE OF
    const columnsMatch = sql.match(/UPDATE\s+OF\s+([^)]+)/i);
    if (columnsMatch) {
      triggerInfo.columns = columnsMatch[1].split(",").map((c) => c.trim());
    }

    return triggerInfo;
  }

  // Trích xuất tên function từ action_statement
  extractFunctionName(actionStatement) {
    const match = actionStatement.match(/EXECUTE\s+(FUNCTION|PROCEDURE)\s+([^(]+)/i);
    return match ? match[2].trim() : "";
  }

  // So sánh events
  compareEvents(existingEvents, newEvents) {
    if (!Array.isArray(existingEvents)) {
      existingEvents = [existingEvents];
    }
    if (!Array.isArray(newEvents)) {
      newEvents = [newEvents];
    }

    if (existingEvents.length !== newEvents.length) return false;

    const sortedExisting = existingEvents.map((e) => e.toUpperCase()).sort();
    const sortedNew = newEvents.map((e) => e.toUpperCase()).sort();

    return JSON.stringify(sortedExisting) === JSON.stringify(sortedNew);
  }

  // Thực thi SQL trigger
  async executeTriggerSql(sql) {
    try {
      await this.pool.query(sql);
      console.log("✅ Trigger đã được tạo/cập nhật thành công");
      return true;
    } catch (error) {
      console.error("❌ Lỗi khi tạo trigger:", error.message);
      return false;
    }
  }

  // Xóa trigger cũ
  async dropTrigger(triggerName, tableName, schemaName = "current") {
    const dropSql = `DROP TRIGGER IF EXISTS ${triggerName} ON ${schemaName}.${tableName}`;
    try {
      await this.pool.query(dropSql);
      console.log(`🗑️ Đã xóa trigger cũ: ${triggerName}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa trigger:", error.message);
      return false;
    }
  }

  // Hàm chính để xử lý trigger
  async processTriggersSQL(triggerSqlArray, options = {}) {
    const { forceUpdate = false, skipIfExists = true, logDetails = true } = options;

    console.log(`🚀 Bắt đầu xử lý ${triggerSqlArray.length} trigger(s)...\n`);

    for (let i = 0; i < triggerSqlArray.length; i++) {
      const sql = triggerSqlArray[i];
      const triggerInfo = this.parseTriggerSql(sql);

      if (!triggerInfo.name || !triggerInfo.table) {
        console.log(`⚠️ Không thể parse trigger ${i + 1}, bỏ qua...`);
        continue;
      }

      const [schema, table] = triggerInfo.table.includes(".") ? triggerInfo.table.split(".") : ["current", triggerInfo.table];

      console.log(`\n📋 Xử lý trigger: ${triggerInfo.name} trên bảng ${schema}.${table}`);

      // Kiểm tra trigger có tồn tại không
      const exists = await this.triggerExists(triggerInfo.name, table, schema);

      if (!exists) {
        if (logDetails) console.log("ℹ️ Trigger chưa tồn tại, tạo mới...");
        await this.executeTriggerSql(sql);
      } else {
        if (skipIfExists && !forceUpdate) {
          if (logDetails) console.log("✅ Trigger đã tồn tại, bỏ qua...");
          continue;
        }

        // Lấy thông tin trigger hiện tại
        const existingTrigger = await this.getTriggerInfo(triggerInfo.name, table, schema);
        const isSameStructure = this.compareTriggerStructure(existingTrigger, sql);

        if (isSameStructure && !forceUpdate) {
          if (logDetails) console.log("✅ Trigger có cấu trúc giống nhau, bỏ qua...");
        } else {
          if (logDetails) console.log("🔄 Trigger có cấu trúc khác hoặc bắt buộc cập nhật, thay thế...");

          // Xóa trigger cũ và tạo lại
          await this.dropTrigger(triggerInfo.name, table, schema);
          await this.executeTriggerSql(sql);
        }
      }
    }

    console.log("\n🎉 Hoàn thành xử lý tất cả triggers!");
  }

  // Đóng kết nối
  async close() {
    await this.pool.end();
  }
}

// Sử dụng
async function main() {
  // Cấu hình database
  const dbConfig = {
    user: "postgres",
    host: "localhost",
    database: "emr_omon",
    password: "123456",
    port: 5432,
  };

  // Danh sách SQL triggers
  const triggerSqlArray = [
    `
DROP TRIGGER IF EXISTS trg_notify_current_chuyenphong_changes ON current.chuyenphong;
CREATE TRIGGER trg_notify_current_chuyenphong_changes
AFTER INSERT OR UPDATE OF ngaychuyen,madvc,mapc,madvn,mapn,taikhoan,ketthuc OR DELETE ON current.chuyenphong
FOR EACH ROW
EXECUTE FUNCTION badt_dhs.create_badt_dhs_notifications('mabn,makb','ngaychuyen,madvc,mapc,madvn,mapn,taikhoan,ketthuc');
  `,

    // Thêm các trigger khác ở đây
    // `DROP TRIGGER IF EXISTS trg_notify_current_dmphongban_changes ON current.dmphongban;
    //  CREATE TRIGGER trg_notify_current_dmphongban_changes
    //  AFTER INSERT OR UPDATE OF tenpb,mota OR DELETE
    //  ON current.dmphongban
    //  FOR EACH ROW
    //  EXECUTE FUNCTION badt_dhs.create_badt_dhs_notifications('mapb','tenpb,mota');`
  ];

  const triggerManager = new TriggerManager(dbConfig);

  try {
    // Xử lý triggers với các tùy chọn
    await triggerManager.processTriggersSQL(triggerSqlArray, {
      forceUpdate: true, // true: bắt buộc cập nhật dù đã tồn tại
      skipIfExists: true, // true: bỏ qua nếu đã tồn tại và giống nhau
      logDetails: true, // true: hiển thị log chi tiết
    });
  } catch (error) {
    console.error("Lỗi trong quá trình xử lý:", error);
  } finally {
    await triggerManager.close();
  }
}

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
  main().catch(console.error);
}

module.exports = TriggerManager;
