const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

//[ÔNG TRIỆU HẬU: 2025-08-05] Xử lý an toàn json, không bị lỗi khi có ký tự ' và các ký tự đặc biệt trong json
// đồng thời tránh lỗi: nguy cơ SQL injection.
const insertReceived_data = (path, payload, processed, operation) => {
  let payloadText = "null";
  if (typeof payload === "object") payloadText = JSON.stringify(payload);
  else if (typeof payload === "string") payloadText = payload + " ";
  return {
    query: `
        INSERT INTO badt_dhs.received_data (path, payload, received_at, processed, operation)
        VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
        RETURNING id;
    `,
    params: [path, payloadText, processed, operation],
  };
};

const resendNotification = (retry_count) => {
  return `
        SELECT payload, path, id, retry_count 
        FROM badt_dhs.received_data 
        WHERE processed = false AND retry_count <= ${retry_count} 
        ORDER BY received_at ASC 
    `;
};

const updateRetryCount = (id, retry_count) => {
  return `
        UPDATE badt_dhs.received_data 
        SET retry_count = '${retry_count}' 
        WHERE id = '${id}'
        RETURNING id; 
    `;
};

const updateProcessed = (id) => {
  return `
        UPDATE badt_dhs.received_data 
        SET processed = true 
        WHERE id = '${id}'
        RETURNING id; 
    `;
};

// ==================== MIGRATION QUERIES ====================
const migrationQueries = [
  {
    id: "create_schema_badt_dhs",
    description: "Tạo schema badt_dhs",
    query: `CREATE SCHEMA IF NOT EXISTS badt_dhs;`,
  },
  {
    id: "create_table_received_data",
    description: "Tạo bảng received_data",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'received_data' AND n.nspname = 'badt_dhs'
                ) THEN
                    CREATE TABLE badt_dhs.received_data (
                        id SERIAL PRIMARY KEY
                    );
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_received_data_path",
    description: "Thêm cột path vào received_data",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'received_data' 
                        AND column_name = 'path'
                ) THEN
                    ALTER TABLE badt_dhs.received_data ADD COLUMN path VARCHAR(255);
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_received_data_payload",
    description: "Thêm cột payload vào received_data",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'received_data' 
                        AND column_name = 'payload'
                ) THEN
                    ALTER TABLE badt_dhs.received_data ADD COLUMN payload JSONB NOT NULL DEFAULT '{}'::jsonb;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_received_data_processed",
    description: "Thêm cột processed vào received_data",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'received_data' 
                        AND column_name = 'processed'
                ) THEN
                    ALTER TABLE badt_dhs.received_data ADD COLUMN processed BOOLEAN DEFAULT FALSE;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_received_data_operation",
    description: "Thêm cột operation vào received_data",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'received_data' 
                        AND column_name = 'operation'
                ) THEN
                    ALTER TABLE badt_dhs.received_data ADD COLUMN operation VARCHAR(10) NOT NULL DEFAULT 'insert';
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_received_data_retry_count",
    description: "Thêm cột retry_count vào received_data",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'received_data' 
                        AND column_name = 'retry_count'
                ) THEN
                    ALTER TABLE badt_dhs.received_data ADD COLUMN retry_count INTEGER DEFAULT 0;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_received_data_received_at",
    description: "Thêm cột received_at vào received_data",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'received_data' 
                        AND column_name = 'received_at'
                ) THEN
                    ALTER TABLE badt_dhs.received_data ADD COLUMN received_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        `,
  },
  {
    id: "create_table_signs",
    description: "Tạo bảng signs",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'signs' AND n.nspname = 'badt_dhs'
                ) THEN
                    CREATE UNLOGGED TABLE badt_dhs.signs (
                        mabn             TEXT,
                        maba             TEXT,
                        makb             TEXT,
                        thoigianphatsinh TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        module           TEXT,
                        loaikyso         TEXT,
                        trangthai        TEXT,
                        taikhoan         TEXT,
                        manv             TEXT,
                        filepath         TEXT,
                        response         TEXT,
                        request          TEXT,
                        filedoctypecode  TEXT,
                        filename         TEXT
                    );
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_mabn",
    description: "Thêm cột mabn vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'mabn'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN mabn TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_maba",
    description: "Thêm cột maba vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'maba'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN maba TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_makb",
    description: "Thêm cột makb vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'makb'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN makb TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_thoigianphatsinh",
    description: "Thêm cột thoigianphatsinh vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'thoigianphatsinh'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN thoigianphatsinh TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_module",
    description: "Thêm cột module vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'module'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN module TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_loaikyso",
    description: "Thêm cột loaikyso vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'loaikyso'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN loaikyso TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_trangthai",
    description: "Thêm cột trangthai vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'trangthai'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN trangthai TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_taikhoan",
    description: "Thêm cột taikhoan vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'taikhoan'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN taikhoan TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_manv",
    description: "Thêm cột manv vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'manv'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN manv TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_filepath",
    description: "Thêm cột filepath vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'filepath'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN filepath TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_response",
    description: "Thêm cột response vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'response'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN response TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_request",
    description: "Thêm cột request vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'request'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN request TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_filedoctypecode",
    description: "Thêm cột filedoctypecode vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'filedoctypecode'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN filedoctypecode TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_signs_filename",
    description: "Thêm cột filename vào signs (nếu thiếu)",
    query: `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'badt_dhs' 
                        AND table_name = 'signs' 
                        AND column_name = 'filename'
                ) THEN
                    ALTER TABLE badt_dhs.signs ADD COLUMN filename TEXT;
                END IF;
            END $$;
        `,
  },
  {
    id: "set_owner_signs",
    description: "Set owner cho bảng signs",
    query: `
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'signs' AND n.nspname = 'badt_dhs'
                ) THEN
                    ALTER TABLE badt_dhs.signs OWNER TO postgres;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_qtdieutri_signstatus",
    description: "Thêm cột signstatus vào current.qtdieutri",
    query: `
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'qtdieutri' AND n.nspname = 'current'
                ) THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'current' 
                            AND table_name = 'qtdieutri' 
                            AND column_name = 'signstatus'
                    ) THEN
                        ALTER TABLE current.qtdieutri ADD COLUMN signstatus NUMERIC(1);
                    END IF;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_pskhamha_api",
    description: "Thêm cột api vào current.pskhamha",
    query: `
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'pskhamha' AND n.nspname = 'current'
                ) THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'current' 
                            AND table_name = 'pskhamha' 
                            AND column_name = 'api'
                    ) THEN
                        ALTER TABLE current.pskhamha ADD COLUMN api NUMERIC(1,0);
                    END IF;
                END IF;
            END $$;
        `,
  },
  {
    id: "add_column_pskhamha_filepath",
    description: "Thêm cột filepath vào current.pskhamha",
    query: `
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE c.relname = 'pskhamha' AND n.nspname = 'current'
                ) THEN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'current' 
                            AND table_name = 'pskhamha' 
                            AND column_name = 'filepath'
                    ) THEN
                        ALTER TABLE current.pskhamha ADD COLUMN filepath VARCHAR(500);
                    END IF;
                END IF;
            END $$;
        `,
  },
];

// ==================== MIGRATION UTILITIES ====================

// Hàm tạo hash từ query
function createHash(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Hàm kiểm tra và tạo thư mục
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Hàm kiểm tra migration đã chạy chưa
function isMigrationExecuted(migrationId, hashValue) {
  const hashDir = path.join(process.cwd(), ".createTable");
  ensureDirectoryExists(hashDir);

  const hashFile = path.join(hashDir, `${migrationId}.hash`);

  if (fs.existsSync(hashFile)) {
    const savedHash = fs.readFileSync(hashFile, "utf8");
    return savedHash === hashValue;
  }

  return false;
}

// Hàm lưu hash sau khi migration thành công
function saveMigrationHash(migrationId, hashValue) {
  const hashDir = path.join(process.cwd(), ".createTable");
  ensureDirectoryExists(hashDir);

  const hashFile = path.join(hashDir, `${migrationId}.hash`);
  fs.writeFileSync(hashFile, hashValue, "utf8");
}

// ==================== MAIN MIGRATION FUNCTION ====================

/**
 * Hàm chạy tất cả migrations
 * @param {Function} executeQuery - Hàm thực thi query (query, params) => Promise
 * @param {{silent?: boolean, stopOnError?: boolean}} [options] - Tùy chọn
 * @returns {Promise<{executed: number, skipped: number, failed: number, total: number, errors: Array, success: boolean}>} Kết quả migration
 */
async function runMigrations(executeQuery, options = {}) {
  const { silent = false, stopOnError = false } = options;

  if (!silent) console.log("🚀 Bắt đầu chạy migrations...\n");

  let executed = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const migration of migrationQueries) {
    const hash = createHash(migration.query);

    try {
      // Kiểm tra xem migration đã chạy chưa
      if (isMigrationExecuted(migration.id, hash)) {
        if (!silent) console.log(`⏭️  Bỏ qua: ${migration.description}`);
        skipped++;
        continue;
      }

      // Thực thi migration
      if (!silent) console.log(`🔄 Đang thực thi: ${migration.description}...`);
      await executeQuery(migration.query, []);

      // Lưu hash sau khi thành công
      saveMigrationHash(migration.id, hash);
      if (!silent) console.log(`✅ Thành công: ${migration.description}\n`);
      executed++;
    } catch (error) {
      const errorInfo = {
        migration: migration.id,
        description: migration.description,
        error: error.message,
      };
      errors.push(errorInfo);

      if (!silent) {
        console.error(`❌ Lỗi: ${migration.description}`);
        console.error(`   Chi tiết: ${error.message}\n`);
      }
      failed++;

      if (stopOnError) {
        throw new Error(`Migration thất bại tại: ${migration.description}\n${error.message}`);
      }
    }
  }

  // Tổng kết
  if (!silent) {
    console.log("\n" + "=".repeat(50));
    console.log("📊 TỔNG KẾT MIGRATIONS:");
    console.log("=".repeat(50));
    console.log(`✅ Thực thi thành công: ${executed}`);
    console.log(`⏭️  Đã bỏ qua: ${skipped}`);
    console.log(`❌ Thất bại: ${failed}`);
    console.log(`📝 Tổng cộng: ${migrationQueries.length}`);
    console.log("=".repeat(50));

    if (errors.length > 0) {
      console.log("\n⚠️  CHI TIẾT LỖI:");
      errors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.description}`);
        console.log(`   ID: ${err.migration}`);
        console.log(`   Lỗi: ${err.error}\n`);
      });
    }
  }

  return {
    executed,
    skipped,
    failed,
    total: migrationQueries.length,
    errors,
    success: failed === 0,
  };
}

// ==================== EXPORTS ====================

/**
 * @typedef {Object} MigrationResult
 * @property {number} executed - Số migration chạy thành công
 * @property {number} skipped - Số migration đã chạy trước đó
 * @property {number} failed - Số migration thất bại
 * @property {number} total - Tổng số migration
 * @property {Array} errors - Mảng chi tiết lỗi
 * @property {boolean} success - true nếu không có lỗi
 */

/**
 * Object chứa tất cả queries và migration functions
 */
const queries = {
  /**
   * Hàm chạy tất cả migrations
   * @param {(query: string, params: any[]) => Promise<any>} executeQuery - Hàm thực thi query
   * @param {{silent?: boolean, stopOnError?: boolean}} [options={}] - Tùy chọn
   * @returns {Promise<MigrationResult>} Kết quả migration
   */
  runMigrations: runMigrations,

  // Original queries
  resendNotification: resendNotification,
  insertReceived_data: insertReceived_data,
  updateRetryCount: updateRetryCount,
  updateProcessed: updateProcessed,

  // Backward compatibility - deprecated
  createTable: `
        -- DEPRECATED: Sử dụng queries.runMigrations(executeQuery) thay thế
        -- Migration này đã được tách thành nhiều migration nhỏ để tránh lock hệ thống
        SELECT 1 WHERE false;
    `,
};

module.exports = queries;
