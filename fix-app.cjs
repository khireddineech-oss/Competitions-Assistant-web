const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(`      </main>
    </div>
      </div>
    </ErrorBoundary>
  );
}`, `      </main>
    </div>
    </ErrorBoundary>
  );
}`);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed");
