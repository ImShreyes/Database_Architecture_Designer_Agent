import { Header, ErrorBanner } from './components/common';
import { PromptInput } from './components/PromptInput';
import { SchemaVisualizer } from './components/SchemaVisualizer';
import { SQLEditor } from './components/SQLEditor';
import { useSchema } from './store/schemaStore';
import { Shield, Zap, Code2 } from 'lucide-react';

function App() {
  const schema = useSchema();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <ErrorBanner />

        {/* Prompt Section */}
        <section>
          <PromptInput />
        </section>

        {/* Results Section */}
        {schema && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Result 1: SQL Code */}
                <div className="h-full">
                    <SQLEditor />
                </div>
                
                {/* Result 2: Visualizer */}
                <div className="h-full">
                    <SchemaVisualizer />
                </div>
            </div>
        )}
        
        {/* SQL Query Preview (Static example as per screenshot) */}
        {schema && (
             <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-bold text-slate-800">SQL Query Preview</h3>
                </div>
                <div className="p-6 bg-slate-50/50">
                    <div className="bg-blue-100/50 text-blue-800 px-4 py-2 rounded mb-4 text-sm font-medium">
                        // - Fetch all orders with user and payment details
                    </div>
                    <pre className="font-mono text-sm text-slate-700 bg-white p-4 rounded border border-slate-200">
                        <span className="text-purple-600">SELECT</span> orders.id, <span className="text-red-500">users.name</span>, payments.amount{'\n'}
                        <span className="text-purple-600">FROM</span> orders{'\n'}
                        <span className="text-purple-600">JOIN</span> users <span className="text-purple-600">ON</span> orders.<span className="text-red-500">user_id</span> = users.id{'\n'}
                        <span className="text-purple-600">JOIN</span> payments <span className="text-purple-600">ON</span> payments.order_id = orders.id;
                    </pre>
                </div>
            </div>
        )}

        {/* Footer Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 pb-12">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Zap className="w-6 h-6" />
                </div>
                <span className="font-semibold text-slate-700">Efficient Generation</span>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Code2 className="w-6 h-6" />
                </div>
                <span className="font-semibold text-slate-700">SQL Syntax Highlighting</span>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <Shield className="w-6 h-6" />
                </div>
                <span className="font-semibold text-slate-700">Secure & Exportable</span>
            </div>
        </div>
      </main>

      {/* Footer Copyright */}
      <footer className="bg-slate-50 border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
         <p>© 2024 DB Architecture Agent. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
