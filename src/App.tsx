import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh'; // Updated import
import type { SelectChangeEvent } from '@mui/material';

// Type definitions
interface PageSpeedResult {
  url: string;
  strategy: 'mobile' | 'desktop';
  date: string;
  score: number;
  metrics: {
    fcp: number; // in seconds
    lcp: number; // in seconds
    tti: number; // in seconds
    tbt: number; // in milliseconds
    cls: number; // unitless
  };
}


// Thresholds
const THRESHOLDS = {
  SCORE_GOOD: 0.9,
  SCORE_NEEDS_IMPROVEMENT: 0.5,
  FCP_GOOD: 2,
  FCP_NEEDS_IMPROVEMENT: 3,
  LCP_GOOD: 2.5,
  LCP_NEEDS_IMPROVEMENT: 4,
  TTI_GOOD: 3.8,
  TTI_NEEDS_IMPROVEMENT: 7.3,
  TBT_GOOD: 300,
  TBT_NEEDS_IMPROVEMENT: 600,
  CLS_GOOD: 0.1,
  CLS_NEEDS_IMPROVEMENT: 0.25
};

// Color scheme
const COLORS = {
  GOOD: '#4CAF50', // Green
  NEEDS_IMPROVEMENT: '#FFC107', // Yellow
  POOR: '#F44336' // Red
};

function App() {

  const API_KEY = import.meta.env.VITE_GOOGLE_PAGE_SPEED_API_KEY;

  if (!API_KEY) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Typography variant="h5" color="error">
          Error: Missing API configuration
        </Typography>
      </div>
    );
  }

  const [url, setUrl] = useState<string>('');
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [results, setResults] = useState<PageSpeedResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const savedResults = localStorage.getItem('pageSpeedResults');
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  const getMetricColor = (value: number, goodThreshold: number, needsImprovementThreshold: number) => {
    if (value <= goodThreshold) return COLORS.GOOD;
    if (value <= needsImprovementThreshold) return COLORS.NEEDS_IMPROVEMENT;
    return COLORS.POOR;
  };

  const extractNumericValue = (displayValue: string): number => {
    return parseFloat(displayValue.replace(/[^\d.]/g, ''));
  };

  const analyzeWebsite = async () => {
    if (!url) return;
    
    setLoading(true);
    setError('');

    try {
      const { data } = await axios.get(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`,
        {
          params: {
            url,
            strategy,
            key: API_KEY,
            category: 'performance'
          }
        }
      );

      const audits = data.lighthouseResult.audits;
      const newResult: PageSpeedResult = {
        url,
        strategy,
        date: new Date().toLocaleString(),
        score: data.lighthouseResult.categories.performance.score*100,
        metrics: {
          fcp: extractNumericValue(audits['first-contentful-paint'].displayValue),
          lcp: extractNumericValue(audits['largest-contentful-paint'].displayValue),
          tti: extractNumericValue(audits.interactive.displayValue),
          tbt: extractNumericValue(audits['total-blocking-time'].displayValue),
          cls: parseFloat(audits['cumulative-layout-shift'].displayValue)
        }
      };

      const updatedResults = [newResult, ...results];
      setResults(updatedResults);
      localStorage.setItem('pageSpeedResults', JSON.stringify(updatedResults));
    } catch (err) {
      setError('Error analyzing website. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStrategyChange = (event: SelectChangeEvent<'mobile' | 'desktop'>) => {
    setStrategy(event.target.value as 'mobile' | 'desktop');
  };

  const reRunTest = async (originalUrl: string, originalStrategy: 'mobile' | 'desktop', index: number) => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`,
        {
          params: {
            url: originalUrl,
            strategy: originalStrategy,
            key: API_KEY,
            category: 'performance'
          }
        }
      );

      const audits = data.lighthouseResult.audits;
      const updatedResult: PageSpeedResult = {
        url: originalUrl,
        strategy: originalStrategy,
        date: new Date().toLocaleString(),
        score: Math.round(data.lighthouseResult.categories.performance.score),
        metrics: {
          fcp: extractNumericValue(audits['first-contentful-paint'].displayValue),
          lcp: extractNumericValue(audits['largest-contentful-paint'].displayValue),
          tti: extractNumericValue(audits.interactive.displayValue),
          tbt: extractNumericValue(audits['total-blocking-time'].displayValue),
          cls: parseFloat(audits['cumulative-layout-shift'].displayValue)
        }
      };

      const updatedResults = [...results];
      updatedResults[index] = updatedResult;
      setResults(updatedResults);
      localStorage.setItem('pageSpeedResults', JSON.stringify(updatedResults));
    } catch (err) {
      setError(`Error re-running test for ${originalUrl}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom 
      style={{
        textAlign:'center',
        paddingBottom: '40px',
        display: 'flex',
        justifyContent: 'center'      }}>
        <img style={{backgroundColor: 'black', 
          padding:'5px',
          borderRadius: '10px'
          }} 
          src="/PK_logo_white.png" alt="logo">
          </img>
     <span style={{alignContent: 'center',
      paddingLeft: '20px'
     }}>Website Performance Analyzer</span> 
      </Typography>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <TextField
          label="Website URL"
          variant="outlined"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          fullWidth
        />

        <Select
          value={strategy}
          onChange={handleStrategyChange}
          style={{ minWidth: '120px' }}
        >
          <MenuItem value="mobile">Mobile</MenuItem>
          <MenuItem value="desktop">Desktop</MenuItem>
        </Select>

        <Button
          variant="contained"
          color="primary"
          onClick={analyzeWebsite}
          disabled={loading || !url}
        >
          {loading ? <CircularProgress size={24} /> : 'Analyze'}
        </Button>
      </div>

      {error && <Typography color="error">{error}</Typography>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Device</TableCell>
              <TableCell>Score {'>'}= 90</TableCell>
              <TableCell>FCP {'<'} 2(s)</TableCell>
              <TableCell>LCP {'<'} 2.5(s)</TableCell>
              <TableCell>TTI {'<'} 3.8(s)</TableCell>
              <TableCell>TBT {'<'} 300(ms)</TableCell>
              <TableCell>CLS {'<'} 0.1</TableCell>
              <TableCell>Actions</TableCell> {/* New column */}
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result, index) => (
              <TableRow key={index}>
                <TableCell>{result.date}</TableCell>
                <TableCell>{result.url}</TableCell>
                <TableCell style={{textTransform: 'capitalize'}}>{result.strategy}</TableCell>
                <TableCell style={{
                  backgroundColor: getMetricColor(
                    result.score, 
                    THRESHOLDS.SCORE_GOOD, 
                    THRESHOLDS.SCORE_NEEDS_IMPROVEMENT
                  ),
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                  {result.score}
                </TableCell>
                <TableCell style={{
                  backgroundColor: getMetricColor(
                    result.metrics.fcp, 
                    THRESHOLDS.FCP_GOOD, 
                    THRESHOLDS.FCP_NEEDS_IMPROVEMENT
                  ),
                  color: 'white'
                }}>
                  {result.metrics.fcp}
                  
                </TableCell>
                <TableCell style={{
                  backgroundColor: getMetricColor(
                    result.metrics.lcp, 
                    THRESHOLDS.LCP_GOOD, 
                    THRESHOLDS.LCP_NEEDS_IMPROVEMENT
                  ),
                  color: 'white'
                }}> 
                  {result.metrics.lcp}
                </TableCell>
                <TableCell style={{
                  backgroundColor: getMetricColor(
                    result.metrics.tti, 
                    THRESHOLDS.TTI_GOOD, 
                    THRESHOLDS.TTI_NEEDS_IMPROVEMENT
                  ),
                  color: 'white'
                }}>
                  {result.metrics.tti}
                </TableCell>
                <TableCell style={{
                  backgroundColor: getMetricColor(
                    result.metrics.tbt, 
                    THRESHOLDS.TBT_GOOD, 
                    THRESHOLDS.TBT_NEEDS_IMPROVEMENT
                  ),
                  color: 'white'
                }}>
                  {result.metrics.tbt}
                </TableCell>
                <TableCell style={{
                  backgroundColor: getMetricColor(
                    result.metrics.cls, 
                    THRESHOLDS.CLS_GOOD, 
                    THRESHOLDS.CLS_NEEDS_IMPROVEMENT
                  ),
                  color: 'white'
                }}>
                  {result.metrics.cls}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => reRunTest(result.url, result.strategy, index)}
                    disabled={loading}
                    aria-label="re-run test"
                    size="small"
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default App;