package org.grapheneos.pdfviewer.activity;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.MenuItem;

import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import org.grapheneos.pdfviewer.ApplicationSingleton;
import org.grapheneos.pdfviewer.R;
import org.grapheneos.pdfviewer.fragment.OutlineListFragment;
import org.grapheneos.pdfviewer.model.OutlineEntry;

import java.util.List;
import java.util.Stack;

public class OutlineActivity extends AppCompatActivity
        implements OutlineListFragment.OnOutlineEntrySelectedListener {
    private static final String TAG = "OutlineActivity";
    private static final String KEY_PAGE_NUMBER = "pagenumber";

    private FragmentManager mFragmentManager;

    private Stack<List<OutlineEntry>> outlinePathStack;

    public static int getPageNumberFromDataIntent(@NonNull Intent data) {
        return data.getIntExtra(KEY_PAGE_NUMBER, -1);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_outline);

        ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.setHomeButtonEnabled(true);
            actionBar.setDisplayHomeAsUpEnabled(true);
            actionBar.setTitle(R.string.action_view_document_outline);
        }

        mFragmentManager = getSupportFragmentManager();
        Fragment currentFragment = mFragmentManager.findFragmentById(R.id.fragment_container);

        if (currentFragment == null && outlinePathStack == null) {
            List<OutlineEntry> outlineEntries = ApplicationSingleton.getInstance()
                    .getOutlineEntries();
            outlinePathStack = new Stack<>();

            addFragmentAndPushToStack(outlineEntries);
        }
    }

    public void addFragmentAndPushToStack(List<OutlineEntry> outlineEntries) {
        Log.d(TAG, "addFragmentAndPushToStack()");
        outlinePathStack.push(outlineEntries);
        OutlineListFragment newListFragment = OutlineListFragment.newInstance(outlineEntries);
        mFragmentManager.beginTransaction()
                .replace(R.id.fragment_container, newListFragment)
                .addToBackStack(null)
                .commit();
        Log.d(TAG, "addFragmentAndPushToStack: New stack size: " + outlinePathStack.size());
    }

    private void popStackAndAddFragment() {
        Log.d(TAG, "popStackAndAddFragment()");
        List<OutlineEntry> outlineEntries = outlinePathStack.pop();
        Log.d(TAG, "Is this popped list empty? " + (outlineEntries == null ? "NULL" : outlineEntries.size()));
        Fragment newFragment = OutlineListFragment.newInstance(outlineEntries);
        mFragmentManager.popBackStack();
        //mFragmentManager.beginTransaction()
        //        .addToBackStack()
        //        .replace(R.id.fragment_container, newFragment)
        //        .commit();
        Log.d(TAG, "popStackAndAddFragment: New stack size: " + outlinePathStack.size());
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                Log.d(TAG, "onOptionsItemSelected: mFragmentManager.getBackStackEntryCount(): " + mFragmentManager.getBackStackEntryCount());
                if (mFragmentManager.getBackStackEntryCount() > 1) {
                    popStackAndAddFragment();
                } else {
                    Log.d(TAG, "onOptionsItemSelected: returning false()");
                    setResult(Activity.RESULT_CANCELED);
                    finish();
                    return false;
                }
            default:
                return super.onOptionsItemSelected(item);
        }
    }



    @Override
    public void onAttachFragment(@NonNull Fragment fragment) {
        if (fragment instanceof OutlineListFragment) {
            OutlineListFragment listFragment = (OutlineListFragment) fragment;
            listFragment.setOnOutlineEntrySelectedListener(this);
        }
        super.onAttachFragment(fragment);
    }

    @Override
    public void onOutlineEntrySelected(int pageNumber) {
        Intent data = new Intent();
        data.putExtra(KEY_PAGE_NUMBER, pageNumber);
        setResult(Activity.RESULT_OK, data);
        // finishActivity(PdfViewer.REQUEST_CODE_OUTLINE);
        finish();
    }
}